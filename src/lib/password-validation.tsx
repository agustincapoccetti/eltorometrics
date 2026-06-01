export interface PwCheck {
  ok: boolean;
  rules: { label: string; passed: boolean }[];
}

export function checkPassword(pw: string): PwCheck {
  const rules = [
    { label: "Mínimo 8 caracteres", passed: pw.length >= 8 },
    { label: "Una letra mayúscula", passed: /[A-Z]/.test(pw) },
    { label: "Una letra minúscula", passed: /[a-z]/.test(pw) },
    { label: "Un número", passed: /[0-9]/.test(pw) },
    { label: "Un carácter especial (!@#$%…)", passed: /[^A-Za-z0-9]/.test(pw) },
  ];
  return { ok: rules.every((r) => r.passed), rules };
}

export function PasswordRules({ pw }: { pw: string }) {
  const { rules } = checkPassword(pw);
  return (
    <ul className="mt-2 space-y-0.5 text-[11px]">
      {rules.map((r) => (
        <li key={r.label} className={r.passed ? "text-green-600" : "text-muted-foreground"}>
          {r.passed ? "✓" : "○"} {r.label}
        </li>
      ))}
    </ul>
  );
}
