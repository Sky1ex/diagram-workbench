import styled, { css } from 'styled-components';


import { formatFilterDateNativeInput, parseFilterDateNativeInput } from '@graphContext/filterDateUtils';

const FilterSection = styled.div`
    padding: 8px 10px 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
`;

const FilterField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    min-width: 0;
    font-size: 11px;
    color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
`;

const filterControlCss = css`
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.color['Neutral/Neutral 30']};
    background: ${({ theme }) => theme.color['Neutral/Neutral 00']};
    font-size: 12px;
    color: ${({ theme }) => theme.color['Neutral/Neutral 90']};

    &:focus {
      outline: 2px solid ${({ theme }) => theme.color['Primary/Primary 60 Main']};
      outline-offset: 0;
    }
`;

const FilterSelect = styled.select`
    ${filterControlCss}
    cursor: pointer;
`;

const FilterInput = styled.input`
    ${filterControlCss}

    &[type='date'] {
      appearance: none;
      -webkit-appearance: none;
    }

    &::-webkit-date-and-time-value {
      text-align: left;
    }

    &::-webkit-calendar-picker-indicator {
      margin: 0;
      padding: 0;
    }
`;

const FilterHint = styled.p`
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: ${({ theme }) => theme.color['Neutral/Neutral 50']};
`;

const FilterActions = styled.div`
    display: flex;
    gap: 6px;
    padding-top: 2px;
`;

const FilterActionButton = styled.button`
    flex: 1;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid
      ${({ theme, $primary }) =>
		$primary ? theme.color['Primary/Primary 60 Main'] : theme.color['Neutral/Neutral 30']};
    background: ${({ theme, $primary }) =>
		$primary ? theme.color['Primary/Primary 60 Main'] : theme.color['Neutral/Neutral 00']};
    font-size: 12px;
    color: ${({ theme, $primary }) =>
		$primary ? theme.color['Special/Static White'] : theme.color['Neutral/Neutral 90']};
    cursor: pointer;

    &:hover {
      opacity: 0.92;
    }
`;

export function GraphContextMenuFilter({
	draft,
	depthOptions,
	hasTimeline,
	onDraftChange,
	onApply,
	onReset
}) {
	const maxDepthValue = draft.maxDepth === undefined ? 'any' : String(draft.maxDepth);
	const subgraphValue =
		draft.hasSubgraph === undefined ? 'any' : draft.hasSubgraph ? 'yes' : 'no';

	return (
		<FilterSection onClick={(event) => event.stopPropagation()}>
			<FilterField>
				Глубина (depth)
				<FilterSelect
					value={maxDepthValue}
					onChange={(event) => {
						const value = event.target.value;
						onDraftChange({
							...draft,
							maxDepth: value === 'any' ? undefined : Number(value)
						});
					}}
				>
					<option value="any">Все уровни</option>
					{depthOptions.map((depth) =>
						<option key={depth} value={String(depth)}>
							Не глубже {depth}
						</option>
					)}
				</FilterSelect>
			</FilterField>
			<FilterHint>
				Узлы глубже выбранного скрываются; папки-предки остаются для навигации.
			</FilterHint>

			<FilterField>
				Подграф
				<FilterSelect
					value={subgraphValue}
					onChange={(event) => {
						const value = event.target.value;
						onDraftChange({
							...draft,
							hasSubgraph:
								value === 'any' ? undefined : value === 'yes' ? true : false
						});
					}}
				>
					<option value="any">Любой</option>
					<option value="yes">Только с подграфом</option>
					<option value="no">Без подграфа</option>
				</FilterSelect>
			</FilterField>

			{hasTimeline &&
				<>
					<FilterField>
						Начало не раньше
						<FilterInput
							type="date"
							value={formatFilterDateNativeInput(draft.startAfter)}
							onChange={(event) =>
								onDraftChange({
									...draft,
									startAfter: parseFilterDateNativeInput(event.target.value)
								})
							}
						/>
					</FilterField>
					<FilterField>
						Начало не позже
						<FilterInput
							type="date"
							value={formatFilterDateNativeInput(draft.startBefore)}
							onChange={(event) =>
								onDraftChange({
									...draft,
									startBefore: parseFilterDateNativeInput(event.target.value)
								})
							}
						/>
					</FilterField>
					<FilterField>
						Окончание не раньше
						<FilterInput
							type="date"
							value={formatFilterDateNativeInput(draft.endAfter)}
							onChange={(event) =>
								onDraftChange({
									...draft,
									endAfter: parseFilterDateNativeInput(event.target.value)
								})
							}
						/>
					</FilterField>
					<FilterField>
						Окончание не позже
						<FilterInput
							type="date"
							value={formatFilterDateNativeInput(draft.endBefore)}
							onChange={(event) =>
								onDraftChange({
									...draft,
									endBefore: parseFilterDateNativeInput(event.target.value)
								})
							}
						/>
					</FilterField>
				</>
			}

			<FilterActions>
				<FilterActionButton type="button" $primary onClick={onApply}>
					Применить
				</FilterActionButton>
				<FilterActionButton type="button" onClick={onReset}>
					Сбросить
				</FilterActionButton>
			</FilterActions>
		</FilterSection>
	);
}

export function normalizeFilterCriteria(draft) {
	const next = {};

	const label = draft.labelContains?.trim();
	if (label) next.labelContains = label;

	if (draft.maxDepth !== undefined) {
		next.maxDepth = draft.maxDepth;
	}

	if (draft.hasSubgraph !== undefined) {
		next.hasSubgraph = draft.hasSubgraph;
	}

	if (draft.startAfter !== undefined) next.startAfter = draft.startAfter;
	if (draft.startBefore !== undefined) next.startBefore = draft.startBefore;
	if (draft.endAfter !== undefined) next.endAfter = draft.endAfter;
	if (draft.endBefore !== undefined) next.endBefore = draft.endBefore;

	return next;
}