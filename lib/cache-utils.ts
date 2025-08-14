// 캐시 만료 시간 (밀리초 단위, 기본값 1시간)
export const CACHE_EXPIRY_TIME = 60 * 60 * 1000 // 1시간

// 세션 ID 키
const SESSION_ID_KEY = "todo_app_session_id"

// 캐시 키
export const CACHE_KEYS = {
  TODOS: "cached_todos",
  COMPLETED_TODOS: "cached_completed_todos",
  LAST_FETCH_TIME: "last_fetch_time",
}

// 새 세션인지 확인
export function isNewSession(): boolean {
  // 브라우저 환경인지 확인
  if (typeof window === "undefined") return true

  // 세션 ID 확인
  const currentSessionId = sessionStorage.getItem(SESSION_ID_KEY)

  if (!currentSessionId) {
    // 새 세션 ID 생성 및 저장
    const newSessionId = Date.now().toString()
    sessionStorage.setItem(SESSION_ID_KEY, newSessionId)
    return true
  }

  return false
}

// 캐시가 만료되었는지 확인
export function isCacheExpired(cacheKey: string = CACHE_KEYS.LAST_FETCH_TIME): boolean {
  const lastFetchTime = localStorage.getItem(cacheKey)

  if (!lastFetchTime) return true

  const now = Date.now()
  const timeDiff = now - Number.parseInt(lastFetchTime)

  return timeDiff > CACHE_EXPIRY_TIME
}

// 캐시 업데이트 시간 저장
export function updateCacheTimestamp(cacheKey: string = CACHE_KEYS.LAST_FETCH_TIME): void {
  localStorage.setItem(cacheKey, Date.now().toString())
}

// 데이터 캐싱
export function cacheData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
  updateCacheTimestamp()
}

// 캐시된 데이터 가져오기
export function getCachedData<T>(key: string): T | null {
  const cachedData = localStorage.getItem(key)
  if (!cachedData) return null

  try {
    return JSON.parse(cachedData) as T
  } catch (error) {
    console.error("캐시 데이터 파싱 오류:", error)
    return null
  }
}

// 캐시 새로고침 필요 여부 확인
export function shouldRefreshCache(): boolean {
  return isNewSession() || isCacheExpired()
}
