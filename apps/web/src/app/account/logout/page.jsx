import useAuth from "@/utils/useAuth";

function MainComponent() {
  const { signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  };
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="text-4xl mb-4">⚽</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">GolMaster</h1>
        <p className="text-gray-600 mb-8">Tem certeza que deseja sair?</p>

        <button
          onClick={handleSignOut}
          className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Sair da conta
        </button>

        <a
          href="/"
          className="block mt-4 text-sm text-green-600 hover:text-green-700"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}

export default MainComponent;
