import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography, spacing } from '@/lib/tokens';
import { CategoryIcon } from './icons/CategoryIcon';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onScan, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [didScan, setDidScan] = useState(false);
  const scanLock = useRef(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setDidScan(true);
    onScan(data);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission ? (
          <ActivityIndicator color={colors.sage} size="large" style={styles.loading} />
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <CategoryIcon name="barcode" size={40} color={colors.muted} />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionSub}>
              Sprout needs your camera to scan barcodes and look up ingredients.
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={styles.grantBtnText}>Allow camera access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Not now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerEnabled
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={didScan ? undefined : handleBarcodeScanned}
            />

            <View style={styles.overlayTop} />
            <View style={styles.middleRow}>
              <View style={styles.overlaySide} />
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.hint}>Point at a barcode to scan</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                <CategoryIcon name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const VF = 220;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1 },

  permissionBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCream, paddingHorizontal: 36, gap: 12,
  },
  permissionTitle: {
    fontSize: typography.sizes['2xl'], fontWeight: '600',
    color: colors.ink, marginTop: 8,
  },
  permissionSub: {
    fontSize: typography.sizes.base, color: colors.muted,
    textAlign: 'center', lineHeight: 22,
  },
  grantBtn: {
    marginTop: 12, backgroundColor: colors.sage, borderRadius: 999,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  grantBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { color: colors.muted, fontSize: typography.sizes.base },

  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  middleRow: { flexDirection: 'row', height: VF },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  viewfinder: { width: VF, height: VF },
  overlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', paddingTop: spacing.xl, gap: spacing.lg,
  },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  closeBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderWidth: 2.5 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
