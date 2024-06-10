const PageLoader1 = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="loader h-64 w-64 rounded-full border-8 border-t-8 border-gray-200 ease-linear"></div>
    </div>
  );
};

const PageLoader2 = () => (
  <div className="flex min-h-screen items-center justify-center">
    <progress className="progress w-56"></progress>
  </div>
);

export { PageLoader1, PageLoader2 };
