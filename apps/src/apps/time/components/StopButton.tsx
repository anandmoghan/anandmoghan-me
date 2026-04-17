interface StopButtonProps {
  onStop: () => void
  disabled?: boolean
}

export function StopButton({ onStop, disabled }: StopButtonProps) {
  return (
    <div className="flex justify-center px-4">
      <button
        onClick={onStop}
        disabled={disabled}
        className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-destructive text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
      >
        <span className="w-3 h-3 rounded-sm bg-destructive" />
        Stop
      </button>
    </div>
  )
}
