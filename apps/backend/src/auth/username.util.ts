export const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

export function slugifyUsernameBase(name: string): string {
  const stripped = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 20);

  return stripped.length >= 3 ? stripped : "user";
}
