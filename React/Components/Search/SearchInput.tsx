import React from "react";
import Icon from "../Icon/Icon";

const SearchInput = ({
	value,
	onChange,
	onKeyDown,
	inputRef,
}: {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	inputRef: React.RefObject<HTMLInputElement>;
}) => (
	<div className="galaxy-search-wrapper galaxy-search-box">
		<Icon name="search" />
		<input
			ref={inputRef}
			className="galaxy-search-input"
			type="text"
			value={value}
			placeholder="Rechercher dans le vault..."
			spellCheck={false}
			autoComplete="off"
			onChange={(e) => onChange(e.target.value)}
			onKeyDown={onKeyDown}
		/>
		{value.length > 0 && (
			<a
				className="galaxy-search-clear"
				aria-label="Effacer la recherche"
				onClick={() => {
					onChange("");
					inputRef.current?.focus();
				}}
			>
				<Icon name="x" />
			</a>
		)}
	</div>
);

export default SearchInput;
