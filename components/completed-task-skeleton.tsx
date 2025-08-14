export function CompletedTaskSkeleton() {
  return (
    <div className="border rounded-lg p-4 animate-pulse dark:border-gray-700">
      <div className="flex items-start">
        <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 mt-1 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}
