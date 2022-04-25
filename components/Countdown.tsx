import { useMantineTheme } from "@mantine/core";
import { LiveTimer } from "./LiveTimer";
import { useTimeUntil } from "./useTimeUntil";

export function Countdown({ endDate }: { endDate: Date }) {
  const theme = useMantineTheme();
  const now = useTimeUntil(endDate.getTime());
  if (now >= endDate.getTime()) {
    return (
      <>
        <b>This competition is now over.</b> Submissions will no longer be
        recorded.
      </>
    );
  }
  return (
    <>
      Time remaining:{" "}
      {endDate.getFullYear() > new Date().getFullYear() ? (
        "-"
      ) : (
        <span style={{ color: theme.colors.gray[6] }}>
          <LiveTimer end={endDate.getTime()} />
        </span>
      )}
    </>
  );
}
