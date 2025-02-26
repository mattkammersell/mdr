let hoveredCell = null;
let wiggleIntervals = [];
let draggedNumbers = null;
let touchGhost = null;

const gridContainer = document.getElementById('grid-stub');

function createGrid() {
  const width = gridContainer.offsetWidth;
  const height = gridContainer.offsetHeight;
  const maxRows = 10;
  const maxCols = 20;

  const cellHeight = height / maxRows;
  const cellWidth = width / maxCols;
  const cellSize = Math.min(cellHeight, cellWidth);
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  const adjustedCellSize = isFirefox ? cellSize * 0.95 : cellSize;

  gridContainer.innerHTML = '';

  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement('div');
    row.classList.add('grid-row');
    gridContainer.appendChild(row);

    for (let j = 0; j < maxCols; j++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      cell.textContent = Math.floor(Math.random() * 10).toString();
      const baseFontSize = Math.max(adjustedCellSize / 2.5, 10);
      cell.style.fontSize = `${baseFontSize}px`;
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.draggable = true; // Direct property for reliability
      row.appendChild(cell);

      cell.addEventListener('mouseover', () => handleHover(cell));
      cell.addEventListener('mouseout', () => handleHoverOut(cell));
      cell.addEventListener('dragstart', (e) => {
        console.log('Drag started on cell:', cell.textContent);
        handleDragStart(e, cell);
      });
      cell.addEventListener('dragend', () => {
        console.log('Drag ended');
        handleDragEnd(cell);
      });
      cell.addEventListener('touchstart', (e) => {
        console.log('Touch started on cell:', cell.textContent);
        handleTouchStart(e, cell);
      }, { passive: false });
      cell.addEventListener('touchmove', (e) => handleTouchMove(e, cell), { passive: false });
      cell.addEventListener('touchend', (e) => handleTouchEnd(e, cell));
    }
  }

  document.querySelectorAll('.box').forEach(box => {
    let progress = parseInt(box.querySelector('.progress-bar').dataset.progress || '0');

    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      box.classList.add('dragover');
    });
    box.addEventListener('dragleave', () => {
      box.classList.remove('dragover');
    });
    box.addEventListener('drop', (e) => {
      console.log('Drop event on box:', box.id);
      e.preventDefault();
      const numbers = e.dataTransfer.getData('text/plain').split(',');
      handleDrop(e, box, progress, numbers);
      progress = parseInt(box.querySelector('.progress-bar').dataset.progress || '0');
    });
  });
}

function handleHover(cell) {
  if (hoveredCell !== cell && !draggedNumbers) {
    clearWiggleIntervals();
    hoveredCell = cell;
    const affectedCells = getJaggedAffectedCells(cell);

    affectedCells.forEach(({ cell: c, distance }) => {
      let scale = distance === 0 ? 2.5 : distance === 1 ? 1.5 : 0.8;
      c.style.transform = `scale(${scale})`;
      c.style.transition = 'transform 0.2s ease-in-out, color 0.2s ease-in-out';
      c.style.zIndex = 1;
      wiggleCell(c, scale);
      c.draggable = true; // Reinforce draggable
    });
  }
}

function handleHoverOut(cell) {
  if (hoveredCell === cell && !draggedNumbers) {
    resetGrid();
  }
}

function handleDragStart(e, cell) {
  const affectedCells = getJaggedAffectedCells(hoveredCell);
  if (affectedCells.some(ac => ac.cell === cell)) {
    draggedNumbers = affectedCells.map(({ cell: c }) => c.textContent);
    e.dataTransfer.setData('text/plain', draggedNumbers.join(','));
    console.log('Dragging numbers:', draggedNumbers);

    affectedCells.forEach(({ cell: c }) => {
      c.classList.add('dragging');
      c.style.opacity = '0.5';
    });

    const dragGroup = createDragGhost(affectedCells, cell);
    document.body.appendChild(dragGroup);
    e.dataTransfer.setDragImage(dragGroup, dragGroup.offsetWidth / 2, dragGroup.offsetHeight / 2);
    setTimeout(() => document.body.removeChild(dragGroup), 0);
  } else {
    console.log('Drag start failed - no affected cells match');
  }
}

function handleDragEnd(cell) {
  if (hoveredCell && getJaggedAffectedCells(hoveredCell).some(ac => ac.cell === cell)) {
    resetGrid();
    draggedNumbers = null;
  }
}

function handleTouchStart(e, cell) {
  e.preventDefault();
  if (!draggedNumbers) {
    hoveredCell = cell;
    const affectedCells = getJaggedAffectedCells(cell);
    draggedNumbers = affectedCells.map(({ cell: c }) => c.textContent);
    console.log('Touch dragging numbers:', draggedNumbers);

    affectedCells.forEach(({ cell: c }) => {
      c.classList.add('dragging');
      c.style.opacity = '0.5';
    });

    touchGhost = createDragGhost(affectedCells, cell);
    document.body.appendChild(touchGhost);
    const touch = e.touches[0];
    updateGhostPosition(touchGhost, touch.pageX, touch.pageY);
  }
}

function handleTouchMove(e, cell) {
  if (draggedNumbers && touchGhost) {
    e.preventDefault();
    const touch = e.touches[0];
    updateGhostPosition(touchGhost, touch.pageX, touch.pageY);

    document.querySelectorAll('.box').forEach(box => {
      const rect = box.getBoundingClientRect();
      if (touch.pageX >= rect.left && touch.pageX <= rect.right &&
          touch.pageY >= rect.top && touch.pageY <= rect.bottom) {
        box.classList.add('dragover');
      } else {
        box.classList.remove('dragover');
      }
    });
  }
}

function handleTouchEnd(e, cell) {
  if (draggedNumbers && touchGhost) {
    const touch = e.changedTouches[0];
    const dropTarget = Array.from(document.querySelectorAll('.box')).find(box => {
      const rect = box.getBoundingClientRect();
      return touch.pageX >= rect.left && touch.pageX <= rect.right &&
             touch.pageY >= rect.top && touch.pageY <= rect.bottom;
    });

    if (dropTarget) {
      console.log('Touch drop on box:', dropTarget.id);
      let progress = parseInt(dropTarget.querySelector('.progress-bar').dataset.progress || '0');
      handleDrop(null, dropTarget, progress, draggedNumbers);
    } else {
      console.log('Touch drop missed box');
    }

    document.body.removeChild(touchGhost);
    touchGhost = null;
    resetGrid();
    draggedNumbers = null;
    hoveredCell = null;
  }
}

function createDragGhost(affectedCells, centerCell) {
  const dragGroup = document.createElement('div');
  dragGroup.style.position = 'absolute';
  dragGroup.style.top = '-9999px';
  const centerRect = centerCell.getBoundingClientRect();
  const cellSize = centerCell.offsetWidth;

  affectedCells.forEach(({ cell: c, distance }) => {
    const clone = c.cloneNode(true);
    clone.classList.add('drag-ghost');
    clone.classList.remove('dragging');
    const rect = c.getBoundingClientRect();
    let scale = distance === 0 ? 2.5 : distance === 1 ? 1.5 : 0.8;
    clone.style.position = 'absolute';
    clone.style.left = `${rect.left - centerRect.left}px`;
    clone.style.top = `${rect.top - centerRect.top}px`;
    clone.style.transform = `scale(${scale})`;
    clone.style.transition = 'none';
    clone.style.opacity = '0.7';
    clone.style.width = `${cellSize}px`;
    clone.style.height = `${cellSize}px`;
    clone.style.fontSize = c.style.fontSize;
    clone.style.color = '#0f0';
    dragGroup.appendChild(clone);
    wiggleCell(clone, scale);
  });

  return dragGroup;
}

function updateGhostPosition(ghost, x, y) {
  ghost.style.top = `${y - ghost.offsetHeight / 2}px`;
  ghost.style.left = `${x - ghost.offsetWidth / 2}px`;
}

function handleDrop(e, box, progress, numbers) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('Dropping numbers:', numbers, 'on box:', box.id);
  box.classList.add('dragover');
  setTimeout(() => box.classList.remove('dragover'), 300);

  progress = Math.min(progress + numbers.length, 100);
  const progressBar = box.querySelector('.progress-bar');
  const progressText = box.querySelector('.progress-text');
  progressBar.style.setProperty('--progress-width', `${progress}%`);
  progressText.textContent = `${progress}%`;
  progressBar.dataset.progress = progress.toString();

  const allProgressBars = document.querySelectorAll('.progress-bar');
  const totalProgress = Array.from(allProgressBars).reduce((sum, bar) => {
    return sum + parseInt(bar.dataset.progress || 0);
  }, 0);
  const avgProgress = Math.min(totalProgress / 5, 100);
  const topProgressBar = document.querySelector('.top-progress-bar');
  const topProgressText = topProgressBar.querySelector('.top-progress-text');
  topProgressBar.style.setProperty('--top-progress-width', `${avgProgress}%`);
  topProgressText.textContent = `${Math.round(avgProgress)}%`;
  topProgressBar.dataset.progress = Math.round(avgProgress).toString();

  if (hoveredCell) {
    const affectedCells = getJaggedAffectedCells(hoveredCell);
    affectedCells.forEach(({ cell: c }) => {
      c.textContent = Math.floor(Math.random() * 10).toString();
      c.classList.remove('dragging');
      c.style.opacity = '1';
      c.style.transform = 'scale(1)';
    });
  }

  resetGrid();
  draggedNumbers = null;
  hoveredCell = null;
}

function getJaggedAffectedCells(centerCell) {
  const cells = document.querySelectorAll('.grid-cell');
  const centerRow = parseInt(centerCell.dataset.row);
  const centerCol = parseInt(centerCell.dataset.col);
  const affected = [{ cell: centerCell, distance: 0 }];

  cells.forEach(cell => {
    if (cell === centerCell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const rowDiff = Math.abs(row - centerRow);
    const colDiff = Math.abs(col - centerCol);
    const distance = Math.round(Math.sqrt(rowDiff * rowDiff + colDiff * colDiff));
    if (distance <= 2) {
      const chance = Math.random();
      const isClose = rowDiff <= 1 && colDiff <= 1;
      if (isClose || (distance === 1 && chance > 0.4) || (distance === 2 && chance > 0.7)) {
        affected.push({ cell, distance: Math.min(distance, 2) });
      }
    }
  });
  return affected;
}

function wiggleCell(cell, baseScale) {
  let frame = 0;
  const randomFactor = 20 + Math.random() * 20;
  const interval = setInterval(() => {
    const offsetX = (Math.random() - 0.5) * randomFactor;
    const offsetY = (Math.random() - 0.5) * randomFactor;
    const extraScale = 1 + Math.random() * 0.4;
    cell.style.transform = `scale(${baseScale * extraScale}) translate(${offsetX}px, ${offsetY}px)`;
    frame++;
  }, 1);
  wiggleIntervals.push(interval);
}

function clearWiggleIntervals() {
  wiggleIntervals.forEach(clearInterval);
  wiggleIntervals = [];
}

function resetGrid() {
  clearWiggleIntervals();
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach((c) => {
    c.style.transform = 'scale(1)';
    c.style.opacity = '1';
    c.style.transition = 'transform 0.2s ease-in-out, opacity 0.2s ease-in-out, color 0.2s ease-in-out';
    c.style.zIndex = '';
    c.classList.remove('dragging');
    c.draggable = true;
  });
  hoveredCell = null;
  draggedNumbers = null;
}

window.addEventListener('resize', createGrid);
createGrid();
