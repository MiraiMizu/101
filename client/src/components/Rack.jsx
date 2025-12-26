import { Tile } from './Tile';
import { clsx } from 'clsx';

export const Rack = ({ tiles, onClickTile, selectedTileIndex }) => {
    // Okey rack is usually 2 rows.
    // We can just display them in a flex wrap or grid.
    // Normal rack has ~21-22 slots.

    return (
        <div className="bg-[#e2c17c] p-4 rounded-lg shadow-xl border-4 border-[#8e6b2c] min-h-[220px]">
            <div className="flex flex-wrap gap-2 justify-center">
                {tiles.map((tile, index) => (
                    <div key={`${tile.id}-${index}`} className="relative">
                        <Tile
                            color={tile.color}
                            value={tile.value}
                            type={tile.type}
                            isSelected={selectedTileIndex === index}
                            onClick={() => onClickTile(index)}
                        />
                        {/* Show index for debugging or selection? */}
                    </div>
                ))}
            </div>
        </div>
    );
};
