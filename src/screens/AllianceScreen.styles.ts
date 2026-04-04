import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.sand,
    flex: 1,
  },
  headerLoader: {
    marginLeft: 8,
  },

  // Alliance Header
  allianceHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  allianceHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allianceHeaderTag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
  },
  allianceHeaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  allianceHeaderStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  headerStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  treasuryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  treasuryItem: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.sand,
  },
  tabBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: colors.sand,
    fontWeight: '700',
  },

  // Error / info
  errorText: {
    color: colors.dangerLight,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  errorBanner: {
    backgroundColor: colors.danger,
    color: colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },

  // Sections
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  refreshBtn: {
    fontSize: 13,
    color: colors.sand,
    paddingHorizontal: 4,
  },
  tabScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },

  // No Alliance
  noAllianceScroll: {
    flex: 1,
  },
  noAllianceContent: {
    padding: 16,
  },
  actionCardRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  actionCardSearch: {
    opacity: 0.6,
  },
  actionCardDivider: {
    width: 1,
    backgroundColor: colors.panelBorder,
  },
  actionCardIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionCardSub: {
    fontSize: 11,
    color: colors.sand,
    marginTop: 2,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Alliance rows (no-alliance list)
  allianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  rankNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
    width: 28,
    textAlign: 'center',
  },
  allianceRowInfo: {
    flex: 1,
  },
  allianceTagText: {
    fontSize: 11,
    color: colors.sand,
    fontWeight: '700',
  },
  allianceNameText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  allianceStatText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: colors.military,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  joinBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    gap: 6,
  },
  chatEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  systemMsgRow: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  systemMsgText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  chatMsgRow: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 8,
  },
  chatMsgName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    marginBottom: 2,
  },
  chatMsgTime: {
    fontSize: 10,
    color: colors.textMuted,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  chatMsgText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    backgroundColor: colors.surface,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: colors.textPrimary,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  sendBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  memberOnlineDot: {
    width: 10,
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDotGreen: {
    backgroundColor: colors.success,
  },
  onlineDotGrey: {
    backgroundColor: colors.metalDark,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rankBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberStat: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },
  memberActionBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  memberActionBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberActionBtnTextDanger: {
    fontSize: 11,
    color: colors.dangerLight,
    fontWeight: '600',
  },
  memberActionBtnTextGold: {
    fontSize: 11,
    color: colors.sand,
    fontWeight: '600',
  },

  // Role dropdown
  roleDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: 8,
    marginTop: 6,
    padding: 4,
  },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  roleOptionActive: {
    backgroundColor: colors.militaryDark,
  },
  roleOptionText: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  // Join requests
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  requestInfo: {
    flex: 1,
  },
  approveBtn: {
    backgroundColor: colors.military,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  approveBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: colors.buttonDanger,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Donate
  donateInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  donateCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 12,
    marginBottom: 12,
  },
  donateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  donateCardIcon: {
    fontSize: 18,
  },
  donateCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  donateCardTreasury: {
    fontSize: 11,
    color: colors.textMuted,
  },
  donateCardBalance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  donateBtnRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  donateAmountBtn: {
    flex: 1,
    minWidth: 60,
    backgroundColor: colors.military,
    borderRadius: 5,
    paddingVertical: 7,
    alignItems: 'center',
  },
  donateAmountBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  donateAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  donateAmountTextDisabled: {
    color: colors.buttonDisabledText,
  },

  // Chips
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: colors.military,
    borderColor: colors.sand,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Settings
  settingsSection: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  settingsLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 70,
  },
  settingsInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  settingsToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surfaceAlt,
  },
  settingsToggleActive: {
    backgroundColor: colors.military,
    borderColor: colors.sand,
  },
  settingsToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  settingsToggleTextActive: {
    color: '#fff',
  },
  settingsDropdown: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  dropdownItemActive: {
    backgroundColor: colors.military,
  },
  dropdownItemText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dropdownItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.military,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
  },
  checkboxChecked: {
    backgroundColor: '#c0392b',
    borderColor: '#c0392b',
  },
  settingsWarning: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: 10,
    lineHeight: 18,
  },
  dangerBtn: {
    backgroundColor: colors.buttonDanger,
    borderWidth: 1,
    borderColor: colors.buttonDangerBorder,
    borderRadius: 7,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerBtnExtreme: {
    borderColor: colors.dangerLight,
    backgroundColor: colors.danger,
  },
  dangerBtnDisabled: {
    opacity: 0.5,
  },
  dangerBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
  },
  textInputMulti: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  joinTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  joinTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  joinTypeBtnActive: {
    borderColor: colors.sand,
    backgroundColor: colors.militaryDark,
  },
  joinTypeBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  joinTypeBtnTextActive: {
    color: colors.sand,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
  },
  costLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sand,
  },
  costInsufficient: {
    color: colors.dangerLight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: colors.military,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  confirmBtnText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  surfaceAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  // War banner
  warBanner: { backgroundColor: '#1A0A00', borderWidth: 1, borderColor: colors.sand, borderRadius: 6, padding: 8, marginBottom: 6 },
  warBannerText: { color: colors.sand, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  // War tab
  warHeader: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  warTitle: { color: colors.sand, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  warEnemy: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  warTimer: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  warDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 4, paddingHorizontal: 8 },
  warScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 12 },
  warScoreBlock: { alignItems: 'center', flex: 1 },
  warScoreLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  warScoreValue: { fontSize: 24, fontWeight: '800' },
  warVs: { color: colors.textMuted, fontSize: 16, fontWeight: '800' },
  warBar: { height: 8, backgroundColor: colors.danger, borderRadius: 4, overflow: 'hidden', marginHorizontal: 16 },
  warBarFill: { height: '100%', borderRadius: 4 },
  warHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20, paddingHorizontal: 16 },
  warDeclareBtn: { backgroundColor: colors.sand, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginVertical: 12, marginHorizontal: 16 },
  warDeclareBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  warTargetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
  warAttackBtn: { backgroundColor: '#8B0000', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  warAttackBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  warModalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  warModal: { width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.panelBorder, overflow: 'hidden' },
  warModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.panelBorder },
  warModalTitle: { color: colors.sand, fontSize: 16, fontWeight: '800' },
  warModalClose: { color: colors.textMuted, fontSize: 18, padding: 4 },
  warModalName: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  warBirlikCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
  warBirlikCardSel: { backgroundColor: 'rgba(196,164,85,0.12)' },
  warLogRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: colors.panelBorder },
});
