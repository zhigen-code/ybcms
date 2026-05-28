import type { StorageDriver } from './index'

const HUB_BASE = 'https://hub.ie8.net'

export class HubDriver implements StorageDriver {
  constructor(private token: string) {}

  async upload(_key: string, file: ArrayBuffer, contentType: string): Promise<{ url: string; key: string }> {
    const form = new FormData()
    form.append('file', new Blob([file], { type: contentType }), 'upload')

    const res = await fetch(`${HUB_BASE}/api/images/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Hub upload failed: ${res.status} ${await res.text()}`)

    const data = await res.json() as { data: { image: { id: string } } }
    const id = data.data.image.id
    return { url: `${HUB_BASE}/f/${id}`, key: id }
  }

  async delete(id: string): Promise<void> {
    await fetch(`${HUB_BASE}/api/images/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    })
  }
}
