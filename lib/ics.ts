export function generateICS(title: string, dueDate: string, description?: string): string {
  // dueDate: YYYY-MM-DD
  const [year, month, day] = dueDate.split("-").map(Number);
  const dtStart = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const nextDay = new Date(year, month - 1, day + 1);
  const dtEnd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BuildTrack//BuildTrack//EN",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${title.replace(/\n/g, "\\n")}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${description.replace(/\n/g, "\\n")}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(title: string, dueDate: string, description?: string): void {
  const content = generateICS(title, dueDate, description);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.slice(0, 40).replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
