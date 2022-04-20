import { useEffect, useState } from "react";

export function LiveTimer({ start }: { start: number }) {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  let mins = Math.floor((time - start) / 1000 / 60);
  let secs = Math.floor((time - start) / 1000) % 60;
  if (mins >= 60) {
    mins = 60;
    secs = 0;
  }
  return (
    <>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </>
  );
}
