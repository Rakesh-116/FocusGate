import BlockScreen from '../components/BlockScreen'

export default function BlockScreenPreview() {
  return (
    <BlockScreen
      blockedUrl="youtube.com/shorts"
      onBypass={() => undefined}
      previewMode
    />
  )
}
