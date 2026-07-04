'use client'
import { Listbox } from '@ark-ui/react/listbox'
import { CheckIcon } from 'lucide-react'
import { createStyleContext } from 'styled-system/jsx'
import { listbox } from 'styled-system/recipes'

const { withProvider, withContext } = createStyleContext(listbox)

export const Root = withProvider(Listbox.Root, 'root') as Listbox.RootComponent
export const RootProvider = withProvider(
	Listbox.RootProvider,
	'root',
) as Listbox.RootProviderComponent
export const Content = withContext(Listbox.Content, 'content')
export const Empty = withContext(Listbox.Empty, 'empty')
export const Item = withContext(Listbox.Item, 'item')
export const ItemGroup = withContext(Listbox.ItemGroup, 'itemGroup')
export const ItemGroupLabel = withContext(Listbox.ItemGroupLabel, 'itemGroupLabel')
export const ItemIndicator = withContext(Listbox.ItemIndicator, 'itemIndicator', {
	defaultProps: { children: <CheckIcon /> },
})
export const ItemText = withContext(Listbox.ItemText, 'itemText')
export const Label = withContext(Listbox.Label, 'label')
export const ValueText = withContext(Listbox.ValueText, 'valueText')

export { ListboxContext as Context } from '@ark-ui/react/listbox'
