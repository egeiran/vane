import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, PrimaryButton, Row, SectionLabel, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import {
  backupFileName,
  backupJson,
  createBackup,
  csvFileName,
  purchasesCsv,
  readBackup,
  restoreBackup,
  summarizeBackup,
  type BackupError,
  type BackupFile,
} from '@/lib/backup';
import { pickFile, shareFile, type FileKind, type PickedFile } from '@/lib/backupFiles';
import { formatFull, todayKey, toKey } from '@/lib/dates';
import { getMoney, replaceMoney, useMoney } from '@/lib/moneyStore';
import { applyPurchaseImport, readPurchasesCsv, type CsvImportError, type PurchaseImport } from '@/lib/purchaseImport';
import { getData, replaceData, useStore } from '@/lib/store';
import { useTheme } from '@/theme';

function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

type Message = { kind: 'error'; error: BackupError | CsvImportError | 'read' | 'share' } | { kind: 'done' } | { kind: 'added'; count: number };

/** «5, 9, 12, 14, 20 …» */
const listOf = (items: (string | number)[], max = 5) => items.slice(0, max).join(', ') + (items.length > max ? ' …' : '');

/**
 * Innstillinger → Data: eksporter alt som JSON, kjøpene som CSV, importer en JSON-fil og legg til
 * kjøp fra en CSV-fil. Før en import endrer noe, viser skjermen hva filen inneholder og spør.
 */
export default function DataScreen() {
  const t = useTheme();
  const moneyOn = useStore((s) => s.settings.modules.money);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [csvPlan, setCsvPlan] = useState<PurchaseImport | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const exportAll = async () => {
    setMessage(null);
    const ok = await shareFile(backupFileName(todayKey()), backupJson(createBackup(getData(), getMoney(), new Date())), 'json');
    if (!ok) setMessage({ kind: 'error', error: 'share' });
  };

  const exportCsv = async () => {
    setMessage(null);
    const ok = await shareFile(csvFileName(todayKey()), purchasesCsv(getMoney()), 'csv');
    if (!ok) setMessage({ kind: 'error', error: 'share' });
  };

  /** Teksten i filen man velger, eller `null` når man avbrøt eller filen ikke kunne leses. */
  const choose = async (kind: FileKind): Promise<string | null> => {
    setMessage(null);
    setPending(null);
    setCsvPlan(null);
    let picked: PickedFile | null;
    try {
      picked = await pickFile(kind);
    } catch {
      setMessage({ kind: 'error', error: 'read' });
      return null;
    }
    if (picked === null) return null;
    if ('tooBig' in picked) {
      setMessage({ kind: 'error', error: 'tooBig' });
      return null;
    }
    return picked.text;
  };

  const pick = async () => {
    const text = await choose('json');
    if (text === null) return;
    const res = readBackup(text);
    if (res.ok) setPending(res.backup);
    else setMessage({ kind: 'error', error: res.error });
  };

  const pickCsv = async () => {
    const text = await choose('csv');
    if (text === null) return;
    const res = readPurchasesCsv(text, getMoney());
    if (res.ok) setCsvPlan(res.plan);
    else setMessage({ kind: 'error', error: res.error });
  };

  const addPurchases = () => {
    if (!csvPlan) return;
    useMoney.getState().apply((d) => applyPurchaseImport(d, csvPlan));
    setCsvPlan(null);
    setMessage({ kind: 'added', count: csvPlan.purchases.length });
  };

  const replace = () => {
    if (!pending) return;
    const restored = restoreBackup(pending, getMoney());
    replaceData(restored.data);
    replaceMoney(restored.money);
    setPending(null);
    setMessage({ kind: 'done' });
  };

  const summary = pending ? summarizeBackup(pending) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={tr.common.back} style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>{tr.common.back}</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {tr.backup.title}
      </Text>
      <Text style={[styles.lead, { color: t.sub }]}>{tr.backup.lead}</Text>

      {message ? (
        <View style={[styles.message, { backgroundColor: t.card }]} accessibilityLiveRegion="polite">
          <Icon name={message.kind === 'error' ? 'exclamationmark.circle' : 'checkmark.circle'} size={18} color={t.sub} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.text }}>
            {message.kind === 'done' ? tr.backup.replaced : message.kind === 'added' ? tr.backup.csvAdded(message.count) : tr.backup.errors[message.error]}
          </Text>
        </View>
      ) : null}

      {pending && summary ? (
        <Card style={styles.preview}>
          <Text style={[styles.previewTitle, { color: t.text }]} accessibilityRole="header">
            {tr.backup.previewTitle}
          </Text>
          {summary.exportedAt ? (
            <Text style={[styles.body, { color: t.sub }]}>{tr.backup.previewFrom(formatFull(toKey(summary.exportedAt)))}</Text>
          ) : null}
          <View style={styles.facts}>
            {[
              tr.backup.previewHabits(summary.habits),
              tr.backup.previewDays(summary.days),
              tr.backup.previewGoals(summary.goals),
              // Dagboken vises når filen har noe, eller når den som er her nå, ville blitt borte.
              ...(summary.journal || Object.keys(getData().journal).length ? [tr.backup.previewJournal(summary.journal)] : []),
              tr.backup.previewPurchases(summary.purchases),
              // Faste utgifter vises når filen har noen, eller når de som er her nå, ville blitt borte.
              ...(summary.recurring || getMoney().recurring.length ? [tr.backup.previewRecurring(summary.recurring)] : []),
            ].map((line) => (
              <Text key={line} style={[styles.fact, { color: t.text }]}>
                {`· ${line}`}
              </Text>
            ))}
          </View>
          <Text style={[styles.body, { color: t.sub }]}>{tr.backup.previewWarning}</Text>
          <PrimaryButton label={tr.backup.replace} onPress={replace} />
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.common.cancel} color={t.sub} onPress={() => setPending(null)} />
          </View>
        </Card>
      ) : null}

      {csvPlan ? (
        <Card style={styles.preview}>
          <Text style={[styles.previewTitle, { color: t.text }]} accessibilityRole="header">
            {tr.backup.csvPreviewTitle}
          </Text>
          {csvPlan.first && csvPlan.last ? (
            <Text style={[styles.body, { color: t.sub }]}>{tr.backup.csvPreviewPeriod(formatFull(csvPlan.first), formatFull(csvPlan.last))}</Text>
          ) : null}
          <View style={styles.facts}>
            {[
              tr.backup.csvPreviewNew(csvPlan.purchases.length),
              ...(csvPlan.duplicates ? [tr.backup.csvPreviewDuplicates(csvPlan.duplicates)] : []),
              ...(csvPlan.pending ? [tr.backup.csvPreviewPending(csvPlan.pending)] : []),
              ...(csvPlan.badRows.length ? [tr.backup.csvPreviewBadRows(csvPlan.badRows.length, listOf(csvPlan.badRows))] : []),
            ].map((line) => (
              <Text key={line} style={[styles.fact, { color: t.text }]}>
                {`· ${line}`}
              </Text>
            ))}
          </View>
          {csvPlan.unknownCategories.length ? (
            <Text style={[styles.body, { color: t.sub }]}>{tr.backup.csvPreviewUnknown(listOf(csvPlan.unknownCategories))}</Text>
          ) : null}
          {csvPlan.purchases.length ? (
            <>
              <Text style={[styles.body, { color: t.sub }]}>{tr.backup.csvPreviewNote}</Text>
              <PrimaryButton label={tr.backup.csvAdd(csvPlan.purchases.length)} onPress={addPurchases} />
            </>
          ) : null}
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.common.cancel} color={t.sub} onPress={() => setCsvPlan(null)} />
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>{tr.backup.exportSection}</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <ActionRow first label={tr.backup.exportAll} help={tr.backup.exportAllHelp} icon="square.and.arrow.up" onPress={exportAll} />
          {/* Med Penger av er kjøpene skjult, men de er fortsatt med i «Eksporter alt». */}
          {moneyOn ? <ActionRow label={tr.backup.exportCsv} help={tr.backup.exportCsvHelp} icon="tablecells" onPress={exportCsv} /> : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>{tr.backup.importSection}</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <ActionRow first label={tr.backup.importFile} help={tr.backup.importHelp} icon="square.and.arrow.down" onPress={pick} />
          {moneyOn ? <ActionRow label={tr.backup.importCsv} help={tr.backup.importCsvHelp} icon="tablecells" onPress={pickCsv} /> : null}
        </Card>
      </View>
    </ScrollView>
  );
}

function ActionRow({ label, help, icon, onPress, first }: { label: string; help: string; icon: 'square.and.arrow.up' | 'square.and.arrow.down' | 'tablecells'; onPress: () => void; first?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint={help}>
      <Row first={first}>
        <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
          <Text style={{ fontSize: 16, color: t.text }}>{label}</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>{help}</Text>
        </View>
        <Icon name={icon} size={18} color={t.sub} />
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },
  lead: { fontSize: 15, lineHeight: 21, paddingHorizontal: 20 },
  message: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { marginHorizontal: 16, marginTop: 16, padding: 18, gap: 10 },
  previewTitle: { fontSize: 19, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  facts: { gap: 2 },
  fact: { fontSize: 15, lineHeight: 22, fontVariant: ['tabular-nums'] },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
});
