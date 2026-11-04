import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "cn";
import { Check, ChevronsUpDown } from "lucide-react";

function Combobox({
	value,
	options,
	onValueChange,
	className,
	...props
}: {
	value: string;
	options: readonly string[];
	onValueChange: (value: string) => void;
	className?: string;
	id?: string;
}) {
	const query = value.trim().toLocaleLowerCase();
	const filteredOptions = query
		? options.filter((option) => option.toLocaleLowerCase().includes(query))
		: options;

	return (
		<ComboboxPrimitive.Root
			value={value}
			onInputValueChange={onValueChange}
			onValueChange={(nextValue) => {
				if (nextValue !== null) onValueChange(nextValue);
			}}
			autoHighlight
		>
			<div className="relative">
				<ComboboxPrimitive.Input
					{...props}
					value={value}
					className={cn(
						"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
						className,
					)}
				/>
				<ComboboxPrimitive.Trigger
					tabIndex={-1}
					aria-label="Show cities"
					className="absolute inset-y-0 right-0 flex w-8 cursor-pointer items-center justify-center text-muted-foreground outline-none"
				>
					<ChevronsUpDown aria-hidden="true" className="size-4" />
				</ComboboxPrimitive.Trigger>
			</div>
			<ComboboxPrimitive.Portal>
				<ComboboxPrimitive.Positioner
					className="z-50 outline-none"
					sideOffset={4}
				>
					<ComboboxPrimitive.Popup className="max-h-60 min-w-(--anchor-width) overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md outline-none">
						<ComboboxPrimitive.List className="max-h-60 overflow-y-auto p-1">
							{filteredOptions.map((option, index) => (
								<ComboboxPrimitive.Item
									key={option}
									value={option}
									index={index}
									className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
								>
									{option}
									<ComboboxPrimitive.ItemIndicator>
										<Check aria-hidden="true" className="size-4" />
									</ComboboxPrimitive.ItemIndicator>
								</ComboboxPrimitive.Item>
							))}
							{filteredOptions.length === 0 && (
								<div className="px-2 py-1.5 text-sm text-muted-foreground">
									No cities found.
								</div>
							)}
						</ComboboxPrimitive.List>
					</ComboboxPrimitive.Popup>
				</ComboboxPrimitive.Positioner>
			</ComboboxPrimitive.Portal>
		</ComboboxPrimitive.Root>
	);
}

export { Combobox };
