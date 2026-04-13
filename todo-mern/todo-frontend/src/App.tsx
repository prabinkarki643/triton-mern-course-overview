import { Example } from "./Example"

export function App() {
  return (
    <div className="mx-auto max-w-lg p-4">
      {" "}
      {/* max width, centred, padding */}
      <h1 className="mb-4 text-2xl font-bold">
        {" "}
        {/* large text, bold, bottom margin */}
        My App
      </h1>
      <div className="flex items-center gap-3">
        {" "}
        {/* row layout, vertically centred, gap */}
        <span className="flex-1">Take up space</span>{" "}
        {/* fill remaining width */}
        <span className="text-sm text-gray-500">
          {" "}
          {/* small, grey text */}
          Secondary
        </span>
      </div>
      <div className="mb-5 rounded-lg border bg-white p-3">
        {/* white bg, rounded, border, padding */}
        Card-like container
      </div>
      <Example />
    </div>
  )
}

export default App
