import { useEffect, useState, useCallback } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'

export interface Comment {
  id: string
  bulletId: string
  nickname: string
  text: string
  authorUid: string
  createdAt: Timestamp | null
}

export function useComments(deckSlug: string): {
  commentsByBullet: Record<string, Comment[]>
  loading: boolean
  addComment: (bulletId: string, text: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
} {
  const { user, displayName } = useAuth()
  const [commentsByBullet, setCommentsByBullet] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'shareDecks', deckSlug, 'comments'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const grouped: Record<string, Comment[]> = {}
      snapshot.docs.forEach((docSnap) => {
        const comment = { id: docSnap.id, ...docSnap.data() } as Comment
        if (!grouped[comment.bulletId]) {
          grouped[comment.bulletId] = []
        }
        grouped[comment.bulletId].push(comment)
      })
      setCommentsByBullet(grouped)
      setLoading(false)
    })
    return unsubscribe
  }, [deckSlug])

  const addComment = useCallback(
    async (bulletId: string, text: string) => {
      if (!user) {
        throw new Error('You must be signed in to comment.')
      }
      const trimmedText = text.trim()
      if (!trimmedText) return

      await addDoc(collection(db, 'shareDecks', deckSlug, 'comments'), {
        bulletId,
        nickname: displayName ?? 'Anonymous',
        text: trimmedText,
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      })
    },
    [deckSlug, user, displayName]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return
      await deleteDoc(doc(db, 'shareDecks', deckSlug, 'comments', commentId))
    },
    [deckSlug, user]
  )

  return { commentsByBullet, loading, addComment, deleteComment }
}
