import { useEffect, useRef, useState } from "react"
import { CloseIcon } from "~/components/icons"

export function LyricsPasteDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (lyrics: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => onClose()
  return (
    <dialog className="paste-dialog" ref={dialogRef} onClose={close} aria-labelledby="paste-title">
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.trim()) return
          onSave(draft)
          onClose()
        }}
      >
        <div className="paste-dialog__header">
          <div>
            <p className="paste-dialog__eyebrow">Personal lyric sheet</p>
            <h2 id="paste-title">Paste lyrics</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close lyric editor"><CloseIcon size={19} /></button>
        </div>
        <p className="paste-dialog__help">Time tags such as <code>[01:14.20]</code> make each line seekable. Plain text stays readable with gentle guide timing.</p>
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder={'[00:12.00]A line of lyrics\n[00:18.50]The next line'}
          aria-label="Lyrics to use for this song"
          rows={13}
        />
        <div className="paste-dialog__actions">
          <button className="button button--quiet" type="button" onClick={onClose}>Cancel</button>
          <button className="button button--primary" type="submit">Use these lyrics</button>
        </div>
      </form>
    </dialog>
  )
}
