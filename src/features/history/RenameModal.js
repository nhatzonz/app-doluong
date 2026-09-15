import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useT } from '../../i18n';
import { COLORS } from '../../utils/colors';
import { Button } from '../ui/kit';

const MAX_NAME = 60;

// Alert.prompt chi co tren iOS → tu lam modal de chay ca Android
export function RenameModal({ visible, initialName, onCancel, onSave }) {
  const { t } = useT();
  const [name, setName] = useState(initialName || '');

  useEffect(() => {
    if (visible) setName(initialName || '');
  }, [visible, initialName]);

  const trimmed = name.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.box}>
          <Text style={styles.title}>{t('history.renameTitle')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={MAX_NAME}
            autoFocus
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onSave(trimmed)}
          />
          <View style={styles.row}>
            <Button title={t('common.cancel')} variant="ghost" onPress={onCancel} style={styles.flex} />
            <Button title={t('common.save')} onPress={() => onSave(trimmed)} disabled={!trimmed} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  box: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 18 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
});
