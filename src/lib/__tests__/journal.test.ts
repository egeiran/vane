import { describe, expect, it } from '@jest/globals';

import { backupJson, createBackup, readBackup, summarizeBackup } from '../backup';
import { canEditJournal, journalOn, MAX_JOURNAL_TEXT, moodFraction, setJournalText, setMood } from '../journal';
import { EMPTY_MONEY } from '../money';
import { wantsEvening } from '../reminders';
import { loadData, updateSettings } from '../state';
import { DEFAULT_SETTINGS } from '../types';

const TODAY = '2026-11-04';

describe('dagbok og humør', () => {
  it('er tom for data fra før dagboken fantes, og modulen og kveldsvarselet er av', () => {
    const old = { habits: [], logs: {}, goals: {}, goalsSkipped: {}, settings: { morningEnabled: true, morningTime: '07:00', remindersEnabled: true } };
    const data = loadData(old);
    expect(data.journal).toEqual({});
    expect(data.settings.modules.journal).toBe(false);
    expect(data.settings.eveningEnabled).toBe(false);
    expect(data.settings.eveningTime).toBe('21:00');
  });

  it('lagrer humør og en setning per dag', () => {
    let data = loadData(undefined);
    data = setMood(data, TODAY, 4);
    data = setJournalText(data, TODAY, 'Fin tur i skogen.');
    expect(journalOn(data, TODAY)).toEqual({ mood: 4, text: 'Fin tur i skogen.' });
    expect(journalOn(data, '2026-11-03')).toBeUndefined();
  });

  it('tar bort humøret når det samme velges igjen, og hele dagen når ingenting er igjen', () => {
    let data = setMood(loadData(undefined), TODAY, 3);
    data = setMood(data, TODAY, 3);
    expect(data.journal).toEqual({});
    data = setJournalText(setMood(data, TODAY, 2), TODAY, 'Lang dag');
    data = setMood(data, TODAY, 2);
    expect(journalOn(data, TODAY)).toEqual({ mood: null, text: 'Lang dag' });
    data = setJournalText(data, TODAY, '   ');
    expect(data.journal).toEqual({});
  });

  it('holder teksten til én linje og én setning', () => {
    const data = setJournalText(loadData(undefined), TODAY, 'En\nto  \n tre' + 'x'.repeat(400));
    const text = journalOn(data, TODAY)?.text ?? '';
    expect(text.startsWith('En to tre')).toBe(true);
    expect(text).toHaveLength(MAX_JOURNAL_TEXT);
  });

  it('kan bare endres i dag og i går, som vanene', () => {
    expect(canEditJournal(TODAY, TODAY)).toBe(true);
    expect(canEditJournal('2026-11-03', TODAY)).toBe(true);
    expect(canEditJournal('2026-11-02', TODAY)).toBe(false);
    expect(canEditJournal('2026-11-05', TODAY)).toBe(false);
  });

  it('gir svak farge for et tungt humør og ingen farge uten humør', () => {
    expect(moodFraction(undefined)).toBe(0);
    expect(moodFraction({ mood: null, text: 'x' })).toBe(0);
    expect(moodFraction({ mood: 1, text: '' })).toBe(0.2);
    expect(moodFraction({ mood: 5, text: '' })).toBe(1);
  });

  it('sletter ingenting når modulen slås av', () => {
    const data = setMood(loadData(undefined), TODAY, 5);
    const on = updateSettings(data, { modules: { ...data.settings.modules, journal: true } });
    const off = updateSettings(on, { modules: { ...on.settings.modules, journal: false } });
    expect(off.journal).toEqual(data.journal);
  });

  it('sender kveldsvarsel bare når dagboken og varselet er på', () => {
    expect(wantsEvening(DEFAULT_SETTINGS)).toBe(false);
    expect(wantsEvening({ ...DEFAULT_SETTINGS, eveningEnabled: true })).toBe(false);
    expect(wantsEvening({ ...DEFAULT_SETTINGS, eveningEnabled: true, modules: { ...DEFAULT_SETTINGS.modules, journal: true } })).toBe(true);
    expect(wantsEvening({ ...DEFAULT_SETTINGS, modules: { ...DEFAULT_SETTINGS.modules, journal: true } })).toBe(false);
  });

  it('er med i eksporten, og en skadet dagbok avvises', () => {
    const data = setJournalText(setMood(loadData(undefined), TODAY, 4), TODAY, 'Fin dag');
    const good = createBackup(data, EMPTY_MONEY, new Date('2026-11-04T12:00:00Z'));
    const res = readBackup(backupJson(good));
    expect(res.ok && res.backup.data.journal).toEqual({ [TODAY]: { mood: 4, text: 'Fin dag' } });
    expect(res.ok && summarizeBackup(res.backup).journal).toBe(1);
    const tooLong = { [TODAY]: { mood: 3, text: 'x'.repeat(MAX_JOURNAL_TEXT + 1) } };
    for (const journal of [{ [TODAY]: { mood: 6, text: '' } }, { [TODAY]: { mood: 3 } }, { 'i går': { mood: 3, text: '' } }, tooLong]) {
      expect(readBackup(JSON.stringify({ ...good, data: { ...data, journal } }))).toEqual({ ok: false, error: 'damaged' });
    }
    const { journal: _gone, ...older } = data;
    const fromOlder = readBackup(JSON.stringify({ ...good, data: older }));
    expect(fromOlder.ok && fromOlder.backup.data.journal).toEqual({});
  });
});
