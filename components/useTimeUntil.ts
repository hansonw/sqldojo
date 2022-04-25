import { useEffect, useState } from "react";

export function useTimeUntil(endTime: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (Date.now() >= endTime) {
      return;
    }
    const interval = setInterval(() => {
      if (now >= endTime) {
        clearInterval(interval);
      }
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return now;
}
