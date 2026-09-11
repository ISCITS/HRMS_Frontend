/*
Functional responsibility:
- Provide shared utility helpers used across the application.

Inputs:
- CSS class names including optional falsey values.

Output:
- Space-joined className string.

Failure behavior:
- Falsey inputs are ignored.
*/
export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
