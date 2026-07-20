import { Fragment } from "react";
import { GripVertical } from "lucide-react";

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
  className = "",
}) {
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
    <div className="ui-table-wrap">
      <div className="ui-table-scroll">
        <table
          className={cx(
            "ui-table",
            zebra && "ui-table--zebra",
            stickyHeader && "ui-table--sticky-header",
            className,
          )}
        >
          <thead>
            <tr>
              {draggable && <th className="ui-table__drag-cell" scope="col" />}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cx(column.align === "right" && "ui-table__cell--right")}
                  style={{ width: column.width }}
                  scope="col"
                >
                  {column.label}
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
                    className={cx(row.selected && "ui-table__row--selected")}
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
                      );

                      if (renderCell) {
                        return (
                          <td key={column.key} className={cellClassName}>
                            {renderCell({ row, column, value: rawValue, rowIndex })}
                          </td>
                        );
                      }

                      if (column.editable && onCellChange) {
                        return (
                          <td key={column.key} className={cellClassName}>
                            <input
                              className="ui-table__input"
                              value={rawValue ?? ""}
                              onChange={(event) => onCellChange(row, column.key, event.target.value)}
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={column.key} className={cellClassName}>
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
