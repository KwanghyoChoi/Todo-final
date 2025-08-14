export function TaskSkeleton() {
  return (
    <div className="border rounded-lg animate-pulse dark:border-gray-700">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className="h-4 w-4 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  )
}
