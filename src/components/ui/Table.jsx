import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { getTableTotalWidth } from "./tableWidths";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getRowKey(row, index) {
  return row.id ?? row.key ?? index;
}

function isMutedValue(value) {
  return value === "" || value === null || value === undefined || value === 0 || value === "0";
}

function renderValue(value, emptyAsZeroMuted) {
  if (value === "" || value === null || value === undefined) {
    return emptyAsZeroMuted ? "0" : "";
  }

  return value;
}

export default function Table({
  columns = [],
  rows = [],
  onCellChange,
  renderCell,
  renderExpandedRow,
  zebra = true,
  rowHeight = 40,
  stickyHeader = false,
  emptyAsZeroMuted = false,
  draggable = false,
  onReorder,
  getRowClassName,
  getRowId,
  className = "",
  scrollCue = false,
  resizable = false,
  onColumnResizeStart,
  onColumnResizeBy,
}) {
  const scrollRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const stickyOffsets = useMemo(() => {
    let offset = 0;
    return new Map(columns.flatMap((column) => {
      if (!column.sticky) return [];
      const currentOffset = offset;
      offset += Number.parseFloat(column.width) || 0;
      return [[column.key, currentOffset]];
    }));
  }, [columns]);
  const tableWidth = useMemo(() => (
    resizable
      ? getTableTotalWidth(
          columns,
          Object.fromEntries(columns.map((column) => [column.key, column.width])),
        ) + (draggable ? 40 : 0)
      : null
  ), [columns, draggable, resizable]);

  const updateScrollCue = useCallback(() => {
    const node = scrollRef.current;
    if (!node || !scrollCue) {
      setCanScrollRight(false);
      return;
    }
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 2);
  }, [scrollCue]);

  useEffect(() => {
    updateScrollCue();
    const node = scrollRef.current;
    if (!node || !scrollCue) return undefined;
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateScrollCue);
    resizeObserver?.observe(node);
    node.addEventListener("scroll", updateScrollCue, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      node.removeEventListener("scroll", updateScrollCue);
    };
  }, [columns, rows, scrollCue, updateScrollCue]);

  const handleDragStart = (event, index) => {
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isInteger(sourceIndex) || sourceIndex === targetIndex) {
      return;
    }

    onReorder?.(sourceIndex, targetIndex);
  };

  return (
    <div
      className={cx(
        "ui-table-wrap",
        resizable && "ui-table-wrap--resizable",
        canScrollRight && "ui-table-wrap--can-scroll-right",
      )}
    >
      <div ref={scrollRef} className="ui-table-scroll formate-scroll-light">
        <table
          className={cx(
            "ui-table",
            zebra && "ui-table--zebra",
            stickyHeader && "ui-table--sticky-header",
            className,
          )}
          style={resizable ? {
            width: `${tableWidth}px`,
            minWidth: `${tableWidth}px`,
            maxWidth: `${tableWidth}px`,
            tableLayout: "fixed",
          } : undefined}
        >
          {resizable && (
            <colgroup>
              {draggable && <col style={{ width: 40 }} />}
              {columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}
            </colgroup>
          )}
          <thead>
            <tr>
              {draggable && <th className="ui-table__drag-cell" scope="col" />}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cx(
                    column.align === "right" && "ui-table__cell--right",
                    column.sticky && "ui-table__cell--sticky",
                    column.stickyEnd && "ui-table__cell--sticky-end",
                  )}
                  style={{
                    width: column.width,
                    "--ui-table-sticky-left": column.sticky
                      ? `${stickyOffsets.get(column.key) ?? 0}px`
                      : undefined,
                  }}
                  scope="col"
                >
                  {resizable
                    ? <span className="ui-table__header-label">{column.label}</span>
                    : column.label}
                  {resizable && (
                    <button
                      type="button"
                      className="ui-table__resize-handle"
                      aria-label={`${column.ariaLabel || column.label || column.key} 열 너비 조절`}
                      onPointerDown={(event) => onColumnResizeStart?.(column.key, event)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                        event.preventDefault();
                        onColumnResizeBy?.(column.key, event.key === "ArrowLeft" ? -8 : 8);
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const expandedRow = renderExpandedRow?.({ row, rowIndex });

              return (
                <Fragment key={rowKey}>
                  <tr
                    id={getRowId?.(row, rowIndex)}
                    className={cx(
                      row.selected && "ui-table__row--selected",
                      expandedRow && "ui-table__row--owns-expanded",
                      getRowClassName?.(row, rowIndex),
                    )}
                    draggable={draggable}
                    onDragStart={draggable ? (event) => handleDragStart(event, rowIndex) : undefined}
                    onDragOver={draggable ? (event) => event.preventDefault() : undefined}
                    onDrop={draggable ? (event) => handleDrop(event, rowIndex) : undefined}
                    style={{ height: rowHeight }}
                  >
                    {draggable && (
                      <td className="ui-table__drag-cell">
                        <span className="ui-table__drag-handle" aria-hidden="true">
                          <GripVertical size={16} strokeWidth={1.5} />
                        </span>
                      </td>
                    )}
                    {columns.map((column) => {
                      const rawValue = row[column.key];
                      const muted = emptyAsZeroMuted && isMutedValue(rawValue);
                      const cellClassName = cx(
                        column.align === "right" && "ui-table__cell--right",
                        muted && "ui-table__empty-value",
                        column.sticky && "ui-table__cell--sticky",
                        column.stickyEnd && "ui-table__cell--sticky-end",
                      );
                      const cellStyle = column.sticky
                        ? { "--ui-table-sticky-left": `${stickyOffsets.get(column.key) ?? 0}px` }
                        : undefined;

                      if (renderCell) {
                        return (
                          <td key={column.key} className={cellClassName} style={cellStyle}>
                            {renderCell({ row, column, value: rawValue, rowIndex })}
                          </td>
                        );
                      }

                      if (column.editable && onCellChange) {
                        return (
                          <td key={column.key} className={cellClassName} style={cellStyle}>
                            <input
                              className="ui-table__input"
                              value={rawValue ?? ""}
                              onChange={(event) => onCellChange(row, column.key, event.target.value)}
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={column.key} className={cellClassName} style={cellStyle}>
                          {renderValue(rawValue, emptyAsZeroMuted)}
                        </td>
                      );
                    })}
                  </tr>
                  {expandedRow && (
                    <tr className="ui-table__expanded-row">
                      <td colSpan={columns.length + (draggable ? 1 : 0)}>{expandedRow}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
