import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { canEditJournal, journalOn, MAX_JOURNAL_TEXT, MOODS } from '@/lib/journal';
import { useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { shade, useTheme } from '@/theme';

import { tick } from './ui';

/**
 * Dagboken på I dag: ett humør og én setning. I dag og i går kan endres, som vanene. Ingen tall,
 * ingen trend og ingen ros. Teksten lagres litt etter at man har sluttet å skrive, når feltet
 * mister fokus, og når kortet forsvinner, så ikke hvert tastetrykk lagrer alle dataene.
 */
export function JournalCard({ day, isToday }: { day: DateKey; isToday: boolean }) {
  const t = useTheme();
  const today = useToday();
  const editable = canEditJournal(day, today);
  const entry = useStore((s) => journalOn(s, day));
  const setMood = useStore((s) => s.setMood);
  const setText = useStore((s) => s.setJournalText);
  const color = t.colors.lavendel.solid;
  const mood = entry?.mood ?? null;

  const [draft, setDraft] = useState<string | null>(null);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; text: string } | null>(null);
  const flush = () => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    setText(day, pending.current.text);
    pending.current = null;
  };
  const changeText = (text: string) => {
    setDraft(text);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { text, timer: setTimeout(flush, 600) };
  };
  // Kortet forsvinner (ny dag, modulen slått av): lagre det som ikke er lagret ennå.
  useEffect(() => {
    const p = pending;
    return () => {
      if (!p.current) return;
      clearTimeout(p.current.timer);
      useStore.getState().setJournalText(day, p.current.text);
      p.current = null;
    };
  }, [day]);

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.header}>
        <Text style={[styles.question, { color: t.text }]} accessibilityRole="header">
          {isToday ? tr.journal.question : tr.journal.questionYesterday}
        </Text>
        <Text style={[styles.moodName, { color: t.sub }]} accessibilityElementsHidden importantForAccessibility="no">
          {mood ? tr.journal.moods[mood - 1] : ''}
        </Text>
      </View>

      <View style={styles.moods} accessibilityRole="radiogroup" accessibilityLabel={tr.journal.moodLabel}>
        {MOODS.map((m) => {
          const on = m === mood;
          return (
            <Pressable
              key={m}
              onPress={() => {
                tick();
                setMood(day, m);
              }}
              disabled={!editable}
              accessibilityRole="radio"
              accessibilityLabel={tr.journal.moods[m - 1]}
              accessibilityState={{ selected: on }}
              hitSlop={4}
              style={styles.moodHit}>
              <View
                style={[
                  styles.mood,
                  { backgroundColor: shade(t, color, m / 5) },
                  on && { borderWidth: 3, borderColor: t.card, outlineWidth: 2, outlineColor: t.text },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={draft ?? entry?.text ?? ''}
        onChangeText={changeText}
        onBlur={flush}
        editable={editable}
        placeholder={tr.journal.placeholder}
        placeholderTextColor={t.faint}
        maxLength={MAX_JOURNAL_TEXT}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        multiline
        accessibilityLabel={tr.journal.textLabel}
        style={[styles.input, { backgroundColor: t.field, color: t.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  question: { flexShrink: 1, fontSize: 16, fontWeight: '600' },
  moods: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  moodHit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  mood: { width: 38, height: 38, borderRadius: 19 },
  moodName: { fontSize: 14, fontWeight: '500' },
  input: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, fontSize: 16, lineHeight: 21 },
});
