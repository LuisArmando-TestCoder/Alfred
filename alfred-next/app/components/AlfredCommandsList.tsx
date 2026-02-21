interface AlfredCommandsListProps {
  availableCommands: string[];
}

export function AlfredCommandsList({ availableCommands }: AlfredCommandsListProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-4 max-w-4xl max-h-60 overflow-y-auto px-4">
      {availableCommands.map((item) => (
        <li
          key={item}
          className="text-sm text-green-700 bg-black/50 px-2 py-1 border border-green-900 rounded hover:text-green-500 hover:border-green-500 transition-colors"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
