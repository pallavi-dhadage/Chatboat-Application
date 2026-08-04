/**
 * SplitPane — responsive two-column layout.
 * On mobile (<768px): shows either left OR right panel.
 * On desktop: shows both side by side.
 */
export default function SplitPane({ left, right, showRight = false }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — hidden on mobile when right is active */}
      <div className={`
        ${showRight ? 'hidden md:flex' : 'flex'}
        w-full md:w-80 lg:w-96 shrink-0
        flex-col border-r border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
      `}>
        {left}
      </div>

      {/* Right panel — full width on mobile, flex-1 on desktop */}
      <div className={`
        ${showRight ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col bg-gray-50 dark:bg-gray-900
      `}>
        {right || (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
