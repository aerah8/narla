export function AnimatedBackground() {
  return (
    <>
      {/* Dark mode: animated blobs */}
      <div className="hidden dark:block fixed inset-0 -z-10 overflow-hidden bg-[#09090e]">
        <div className="narla-blob-orange" />
        <div className="narla-blob-purple" />
      </div>
      {/* Light mode: gradient image */}
      <div
        className="block dark:hidden fixed inset-0 -z-10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/lightmode.png')" }}
      />
    </>
  );
}
