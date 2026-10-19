import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Box, Popper, TextField, TextFieldProps, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

// A text field with our own prediction dropdown: inset rows, an accent bar on the
// active row, matched text highlighted, and a keyboard hint footer.

type PredictFieldProps<T> = {
  value: string;
  onChange: (value: string) => void;
  /** Options for the current text, best first. Keep it memoized in the parent. */
  getOptions: (query: string) => T[];
  getKey: (item: T) => string;
  renderOption: (item: T, query: string, active: boolean) => React.ReactNode;
  onPick: (item: T) => void;
  /** Label above the list, e.g. "Best matches" or "Frequently sold". */
  heading?: (query: string) => string;
  /** Show options when the field is focused while still empty. */
  openWhenEmpty?: boolean;
  /** What Enter does on the highlighted row, shown in the footer. */
  pickLabel?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  textFieldProps?: TextFieldProps;
};

const Panel = styled('div')(({ theme }) => ({
  marginTop: 6,
  borderRadius: 14,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 18px 40px -12px rgba(0, 0, 0, 0.7)'
      : '0 18px 40px -16px rgba(16, 24, 22, 0.28), 0 2px 6px rgba(16, 24, 22, 0.06)',
  overflow: 'hidden',
  '& .pf-head': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px 6px',
    ...theme.typography.overline,
    fontSize: '0.6875rem',
    lineHeight: 1.4,
    color: theme.palette.text.secondary,
  },
  '& .pf-list': {
    listStyle: 'none',
    margin: 0,
    padding: '0 6px 6px',
    maxHeight: 360,
    overflowY: 'auto',
  },
  '& .pf-option': {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 10px 8px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 4,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 3,
      backgroundColor: 'transparent',
      transition: 'background-color 0.12s',
    },
    '&:hover': { backgroundColor: theme.palette.action.hover },
    '&[aria-selected="true"]': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
      '&::before': { backgroundColor: theme.palette.primary.main },
      '& .pf-enter': { opacity: 1 },
    },
  },
  '& .pf-enter': {
    opacity: 0,
    flexShrink: 0,
    transition: 'opacity 0.12s',
  },
  '& .pf-foot': {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    padding: '8px 14px',
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  '& kbd': {
    display: 'inline-block',
    minWidth: 20,
    padding: '0 5px',
    marginRight: 4,
    borderRadius: 5,
    border: `1px solid ${theme.palette.divider}`,
    borderBottomWidth: 2,
    backgroundColor: theme.palette.background.paper,
    fontFamily: 'inherit',
    fontSize: '0.6875rem',
    fontWeight: 700,
    lineHeight: '18px',
    textAlign: 'center',
    color: theme.palette.text.primary,
  },
}));

/** Wraps the parts of `text` that match words of `query` in a highlight. */
export const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const parts = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [{ text, hit: false }];
    const lower = text.toLowerCase();
    const marks = new Array(text.length).fill(false);
    for (const token of tokens) {
      let from = lower.indexOf(token);
      while (from !== -1) {
        for (let i = from; i < from + token.length; i += 1) marks[i] = true;
        from = lower.indexOf(token, from + token.length);
      }
    }
    const out: Array<{ text: string; hit: boolean }> = [];
    for (let i = 0; i < text.length; i += 1) {
      const last = out[out.length - 1];
      if (last && last.hit === marks[i]) last.text += text[i];
      else out.push({ text: text[i], hit: marks[i] });
    }
    return out;
  }, [text, query]);

  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          <Box
            key={i}
            component="span"
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              borderRadius: '3px',
            }}
          >
            {part.text}
          </Box>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </>
  );
};

function PredictField<T>({
  value,
  onChange,
  getOptions,
  getKey,
  renderOption,
  onPick,
  heading,
  openWhenEmpty = false,
  pickLabel = 'select',
  inputRef,
  textFieldProps,
}: PredictFieldProps<T>) {
  const id = useId();
  const listId = `${id}-list`;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const options = useMemo(() => getOptions(value), [getOptions, value]);
  const hasQuery = value.trim() !== '';
  const showing = open && options.length > 0 && (hasQuery || openWhenEmpty);

  // Typing highlights the best match so Enter takes it. An empty-field list waits for
  // the arrow keys, so a stray Enter never picks something nobody chose.
  useEffect(() => {
    setActive(hasQuery && options.length > 0 ? 0 : -1);
  }, [options, hasQuery]);

  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    const node = listRef.current.children[active] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (item: T) => {
    onPick(item);
    setOpen(false);
  };

  // Keys the dropdown handles stop here; everything else goes on to the field's own handler.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault();
      if (!showing) {
        setOpen(true);
        setActive(0);
      } else {
        setActive((i) => (i + 1) % options.length);
      }
      return;
    }
    if (e.key === 'ArrowUp' && showing) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter' && showing && active >= 0 && options[active]) {
      e.preventDefault();
      pick(options[active]);
      return;
    }
    if (e.key === 'Escape' && showing) {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Tab') setOpen(false);
    textFieldProps?.onKeyDown?.(e);
  };

  const activeId = showing && active >= 0 ? `${id}-opt-${active}` : undefined;

  return (
    <>
      <TextField
        {...textFieldProps}
        ref={anchorRef}
        value={value}
        inputRef={inputRef}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          textFieldProps?.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          textFieldProps?.onBlur?.(e);
        }}
        onKeyDown={onKeyDown}
        inputProps={{
          ...textFieldProps?.inputProps,
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-expanded': showing,
          'aria-controls': showing ? listId : undefined,
          'aria-activedescendant': activeId,
        }}
      />
      <Popper
        open={showing}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ width: anchorRef.current?.offsetWidth, zIndex: 1350 }}
      >
        {/* mousedown would blur the field and close the list before the click lands */}
        <Panel onMouseDown={(e) => e.preventDefault()}>
          <div className="pf-head">
            <span>{heading ? heading(value) : hasQuery ? 'Suggestions' : 'Recent'}</span>
            <span>{options.length}</span>
          </div>
          <ul className="pf-list" id={listId} role="listbox" ref={listRef}>
            {options.map((item, index) => (
              <li
                key={getKey(item)}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                className="pf-option"
                onMouseMove={() => index !== active && setActive(index)}
                onClick={() => pick(item)}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>{renderOption(item, value, index === active)}</Box>
                <Typography className="pf-enter" variant="caption" color="primary.main" fontWeight={700} aria-hidden>
                  ↵
                </Typography>
              </li>
            ))}
          </ul>
          <div className="pf-foot" aria-hidden>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd>choose
            </span>
            <span>
              <kbd>↵</kbd>
              {pickLabel}
            </span>
            <span>
              <kbd>esc</kbd>close
            </span>
          </div>
        </Panel>
      </Popper>
    </>
  );
}

export default PredictField;
