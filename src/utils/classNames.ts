export function classNames(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}
