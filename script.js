let hoveredCell = null;
let wiggleIntervals = [];
let draggedNumbers = null;

const gridContainer = document.getElementById('grid-stub');

function createGrid() {
  const width = gridContainer.offsetWidth;
  const height = gridContainer.offsetHeight; // Use CSS-driven height
  const maxRows = 10;
  const maxCols = 20;

  // Calculate cell size based on container dimensions
  const cellHeight = height / maxRows;
  const cellWidth = width / maxCols;
  const cellSize = Math.min(cellHeight, cellWidth);

  // Firefox adjustment
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
      // Let CSS handle width/height via flex and aspect-ratio
      cell.textContent = Math.floor(Math.random() * 10).toString();
      const baseFontSize = Math.max(adjustedCellSize / 2.5, 10);
      cell.style.fontSize = `${baseFontSize}px`;
      cell.dataset.row = i;
      cell.dataset.col = j;
      row.appendChild(cell);

      cell.addEventListener('mouseover', () => {
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
            c.draggable = true;
          });
        }
      });

      cell.addEventListener('mouseout', () => {
        if (hoveredCell === cell && !draggedNumbers) {
          resetGrid();
        }
      });

      cell.addEventListener('dragstart', (e) => {
        const affectedCells = getJaggedAffectedCells(hoveredCell);
        if (affectedCells.some(ac => ac.cell === cell)) {
          draggedNumbers = affectedCells.map(({ cell: c }) => c.textContent);
          e.dataTransfer.setData('text/plain', draggedNumbers.join(','));

          affectedCells.forEach(({ cell: c }) => {
            c.classList.add('dragging');
            c.style.opacity = '0.5';
          });

          const dragGroup = document.createElement('div');
          dragGroup.style.position = 'absolute';
          dragGroup.style.top = '-9999px';
          const centerRect = hoveredCell.getBoundingClientRect();
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
            clone.style.width = `${adjustedCellSize}px`;
            clone.style.height = `${adjustedCellSize}px`;
            clone.style.fontSize = `${baseFontSize}px`;
            clone.style.color = '#0f0';
            dragGroup.appendChild(clone);
            wiggleCell(clone, scale);
          });
          document.body.appendChild(dragGroup);
          e.dataTransfer.setDragImage(dragGroup, centerRect.width / 2, centerRect.height / 2);
          setTimeout(() => document.body.removeChild(dragGroup), 0);
        }
      });

      cell.addEventListener('dragend', () => {
        if (hoveredCell) {
          const affectedCells = getJaggedAffectedCells(hoveredCell);
          if (affectedCells.some(ac => ac.cell === cell)) {
            resetGrid();
            draggedNumbers = null;
          }
        }
      });
    }
  }

  document.querySelectorAll('.box').forEach(box => {
    let progress = 0;

    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      box.classList.add('dragover');
    });

    box.addEventListener('dragleave', () => {
      box.classList.remove('dragover');
    });

    box.addEventListener('drop', (e) => {
      e.preventDefault();
      const numbers = e.dataTransfer.getData('text/plain').split(',');
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
        });
      }
      resetGrid();
      draggedNumbers = null;
    });
  });
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
  hoveredCell = null;
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach((c) => {
    c.style.transform = 'scale(1)';
    c.style.opacity = '1';
    c.style.transition = 'transform 0.2s ease-in-out, opacity 0.2s ease-in-out, color 0.2s ease-in-out';
    c.style.zIndex = '';
    c.classList.remove('dragging');
    c.draggable = false;
  });
}

window.addEventListener('resize', createGrid);
createGrid();
