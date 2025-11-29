import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Scout 360 Logo"
        width={42}
        height={42}
        className="rounded-lg"
        priority
      />
      <span className="text-xl font-bold tracking-wide">Scout 360</span>
    </div>
  );
}
