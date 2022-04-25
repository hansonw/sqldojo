import { useTimeUntil } from "./useTimeUntil";

export function LiveTimer({ start, end }: { start?: number; end?: number }) {
  const time = useTimeUntil(start ? start + 1000 * 60 * 60 : end);
  let mins: number;
  let secs: number;
  if (start) {
    mins = Math.floor((time - start) / 1000 / 60);
    secs = Math.floor((time - start) / 1000) % 60;
  } else {
    mins = Math.floor((end - time) / 1000 / 60);
    secs = Math.floor((end - time) / 1000) % 60;
  }
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
