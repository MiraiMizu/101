import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const COLORS = {
    red: 'text-red-600',
    black: 'text-gray-900', // Black might be too harsh, gray-900 is softer black
    blue: 'text-blue-600',
    yellow: 'text-yellow-600', // Darker yellow for contrast
    fake_joker: 'text-purple-600' // Distinct color for fake joker
};

export const Tile = ({ color, value, type, onClick, isSelected, className }) => {
    const isJoker = type === 'fake_joker';

    return (
        <div
            onClick={onClick}
            className={twMerge(
                "w-12 h-16 bg-white border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer select-none shadow-md transition-all hover:scale-105",
                isSelected ? "border-blue-500 -translate-y-2 shadow-lg ring-2 ring-blue-300" : "border-slate-300",
                className
            )}
        >
            <div className={clsx("font-bold text-2xl", COLORS[color] || 'text-black')}>
                {isJoker ? '★' : value}
            </div>
            {/* Small indicator at bottom? */}
            {!isJoker && (
                <div className={clsx("w-full h-2 mt-1", COLORS[color]?.replace('text-', 'bg-'))}></div>
            )}
        </div>
    );
};
