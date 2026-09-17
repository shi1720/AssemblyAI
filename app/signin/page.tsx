import SignIn from "./signin-form";
export const metadata = { title: "Open your workspace | Benchback" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  return (
    <SignIn initialMode={params.mode === "signup" ? "signup" : "signin"} />
  );
}
