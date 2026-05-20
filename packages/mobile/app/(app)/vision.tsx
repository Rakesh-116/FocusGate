import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { VisionCard } from '../../components/VisionCard'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { colors } from '../../constants/colors'
import { VisionCardItem, useVisionCards } from '../../hooks/useVisionCards'

export default function VisionScreen() {
  const { visionCards, addCard, deleteCard, isLoading, isSaving } = useVisionCards()
  const [caption, setCaption] = useState('')
  const [pendingUri, setPendingUri] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<VisionCardItem | null>(null)

  const maxReached = visionCards.length >= 10

  async function handlePickImage() {
    if (maxReached) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to add a vision card.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]?.uri) {
      setPendingUri(result.assets[0].uri)
    }
  }

  async function handleSaveCard() {
    if (!pendingUri) return
    await addCard({ imageUri: pendingUri, caption })
    setPendingUri(null)
    setCaption('')
  }

  async function handleDeleteCard() {
    if (!selectedCard) return
    await deleteCard({ id: selectedCard.id, imageUrl: selectedCard.image_url })
    setSelectedCard(null)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vision Board</Text>
          <Text style={styles.subtitle}>Build the screen that inspires you.</Text>
        </View>
        {!maxReached ? <Button label="Add Card" onPress={() => void handlePickImage()} loading={isSaving} /> : <Text style={styles.badge}>10/10 cards</Text>}
      </View>

      {visionCards.length > 0 ? (
        <FlatList
          data={visionCards}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <VisionCard card={item} onLongPress={setSelectedCard} />}
        />
      ) : (
        <Card style={{ margin: 16 }}>
          <Text style={styles.emptyTitle}>Add your first vision card.</Text>
          <Text style={styles.emptyCopy}>These appear on your block screen.</Text>
        </Card>
      )}

      <Modal visible={!!pendingUri} transparent animationType="slide" onRequestClose={() => setPendingUri(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add caption</Text>
            <Input placeholder="This is the life I want to build" value={caption} onChangeText={setCaption} />
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setPendingUri(null)} style={{ flex: 1 }} />
              <Button label="Save" onPress={() => void handleSaveCard()} style={{ flex: 1 }} loading={isSaving} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedCard} transparent animationType="slide" onRequestClose={() => setSelectedCard(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this card?</Text>
            <Text style={styles.subtitle}>This removes it from Supabase and your future block screens.</Text>
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setSelectedCard(null)} style={{ flex: 1 }} />
              <Button label="Delete" variant="danger" onPress={() => void handleDeleteCard()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 6 },
  badge: { color: colors.purpleLight, fontWeight: '700' },
  listContent: { paddingHorizontal: 10, paddingBottom: 24 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyCopy: { color: colors.textMuted, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12 },
})
