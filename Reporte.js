// Variables globales
let csvData = []; // Datos originales del CSV
let filteredData = []; // Datos filtrados para mostrar
let availableContainers = []; // Lista de contenedores disponibles
let currentPage = 1;
const rowsPerPage = 15;
const nonEditableColumns = ['Division', 'Contenedor', 'OC', 'Proveedor', 'Mercancia', 'Id_art', 'Piezas'];
const editableColumns = ['Pre_distribucion', 'Cartones_mix', 'Cantidad_prepack', 'Numero_cajas', 'Observaciones'];

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar controladores de eventos
    initEventListeners();
    
    // Verificar si hay datos en localStorage
    const savedData = localStorage.getItem('containerData');
    if (savedData) {
        try {
            csvData = JSON.parse(savedData);
            availableContainers = getUniqueContainers(csvData);
            showNotification('Datos recuperados de la sesión anterior', 'info');
        } catch (error) {
            console.error('Error al cargar datos guardados:', error);
        }
    }

    // Mostrar año actual en el footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

// Inicializar todos los controladores de eventos
function initEventListeners() {
    // Eventos para carga de archivo CSV
    document.getElementById('load-csv').addEventListener('click', handleFileUpload);
    document.getElementById('csv-file').addEventListener('change', updateFileInfo);
    
    // Eventos para filtros
    document.getElementById('filter-multiple').addEventListener('change', toggleFilterType);
    document.getElementById('filter-single').addEventListener('change', toggleFilterType);
    document.getElementById('apply-filter').addEventListener('click', applyFilters);
    document.getElementById('clear-filter').addEventListener('click', clearFilters);
    document.getElementById('container-single').addEventListener('input', showContainerSuggestions);
    
    // Eventos para la tabla y acciones
    document.getElementById('select-all').addEventListener('change', toggleSelectAll);
    document.getElementById('remove-selected').addEventListener('click', removeSelectedRows);
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    
    // Eventos para paginación
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    
    // Evento para cerrar notificación
    document.getElementById('close-notification').addEventListener('click', () => {
        document.getElementById('notification').classList.add('hidden');
    });
}

// ======== FUNCIONES DE MANEJO DE ARCHIVOS CSV ========

function handleFileUpload() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Por favor selecciona un archivo CSV', 'error');
        return;
    }
    
    // Mostrar estado de carga
    const fileStatus = document.getElementById('file-status');
    fileStatus.textContent = 'Cargando...';
    document.getElementById('file-info').classList.remove('hidden');
    
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                console.error('Errores al procesar CSV:', results.errors);
                fileStatus.textContent = 'Error al procesar el archivo';
                showNotification('Error al procesar el archivo CSV', 'error');
                return;
            }
            
            csvData = normalizeData(results.data);
            availableContainers = getUniqueContainers(csvData);
            
            localStorage.setItem('containerData', JSON.stringify(csvData));
            
            fileStatus.textContent = `Cargado exitosamente - ${csvData.length} registros`;
            showNotification(`Archivo CSV cargado: ${csvData.length} registros`, 'success');
            
            if (filteredData.length === 0) {
                filteredData = [...csvData];
                renderTable();
            }
        },
        error: function(error) {
            console.error('Error:', error);
            fileStatus.textContent = 'Error al cargar el archivo';
            showNotification('Error al cargar el archivo CSV', 'error');
        }
    });
}

function normalizeData(data) {
    return data.map(row => {
        const normalizedRow = {
            Division: row.División || row.Division || '',
            Contenedor: row.Contenedor || '',
            OC: row.OC || row['O.C.'] || '',
            Proveedor: row.Proveedor || '',
            Mercancia: row.Mercancía || row.Mercancia || '',
            Id_art: row['Id art'] || row.Id_art || '',
            Piezas: row.Piezas || 0,
            Pre_distribucion: row['Pre distribución'] || row.Pre_distribucion || '',
            Cartones_mix: row['Cartones mix'] || row.Cartones_mix || '',
            Cantidad_prepack: row['Cantidad por prepack'] || row.Cantidad_prepack || '',
            Numero_cajas: row['Número de cajas'] || row['Numero de cajas'] || row.Numero_cajas || '',
            Observaciones: row['Observaciones e incidencias'] || row.Observaciones || ''
        };
        
        if (typeof normalizedRow.Piezas !== 'number') {
            normalizedRow.Piezas = parseInt(normalizedRow.Piezas) || 0;
        }
        
        return normalizedRow;
    });
}

function getUniqueContainers(data) {
    const containers = data.map(row => row.Contenedor).filter(container => container);
    return [...new Set(containers)].sort();
}

function updateFileInfo() {
    const fileInput = document.getElementById('csv-file');
    const fileName = document.getElementById('file-name');
    const fileInfo = document.getElementById('file-info');
    
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
        fileInfo.classList.remove('hidden');
    } else {
        fileInfo.classList.add('hidden');
    }
}

// ======== FUNCIONES DE FILTRADO ========

function toggleFilterType() {
    const multipleFilter = document.getElementById('filter-multiple');
    
    if (multipleFilter.checked) {
        document.getElementById('multiple-filter').classList.remove('hidden');
        document.getElementById('single-filter').classList.add('hidden');
    } else {
        document.getElementById('multiple-filter').classList.add('hidden');
        document.getElementById('single-filter').classList.remove('hidden');
    }
}

function showContainerSuggestions() {
    const input = document.getElementById('container-single');
    const suggestionsContainer = document.getElementById('container-suggestions');
    const value = input.value.trim().toUpperCase();
    
    suggestionsContainer.innerHTML = '';
    
    if (!value) {
        suggestionsContainer.classList.add('hidden');
        return;
    }
    
    const matches = availableContainers.filter(container => 
        container.toUpperCase().includes(value)
    );
    
    if (matches.length === 0) {
        suggestionsContainer.classList.add('hidden');
        return;
    }
    
    matches.slice(0, 10).forEach(container => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = container;
        item.addEventListener('click', () => {
            input.value = container;
            suggestionsContainer.classList.add('hidden');
        });
        suggestionsContainer.appendChild(item);
    });
    
    suggestionsContainer.classList.remove('hidden');
}

function verificarContenedores(contenedoresIngresados) {
    const contenedoresFaltantes = [];
    const contenedoresDisponibles = availableContainers.map(c => c.toUpperCase());
    
    contenedoresIngresados.forEach(contenedor => {
        const contenedorUpper = contenedor.toUpperCase();
        if (!contenedoresDisponibles.includes(contenedorUpper)) {
            contenedoresFaltantes.push(contenedor);
        }
    });
    
    return contenedoresFaltantes;
}

function applyFilters() {
    const multipleFilter = document.getElementById('filter-multiple').checked;
    let containers = [];
    
    if (multipleFilter) {
        const containerText = document.getElementById('container-list').value;
        containers = containerText.split(/[\s,\n]+/).filter(c => c.trim());
    } else {
        const container = document.getElementById('container-single').value.trim();
        if (container) containers = [container];
    }
    
    if (containers.length === 0) {
        showNotification('Ingresa al menos un contenedor', 'warning');
        return;
    }
    
    // Validar contenedores
    const contenedoresFaltantes = verificarContenedores(containers);
    const contenedoresValidos = containers.length - contenedoresFaltantes.length;
    
    // Feedback visual
    const inputElement = multipleFilter 
        ? document.getElementById('container-list') 
        : document.getElementById('container-single');
    
    if (contenedoresFaltantes.length > 0) {
        inputElement.classList.add('filter-error');
        setTimeout(() => inputElement.classList.remove('filter-error'), 2000);
        
        showNotification(
            `${contenedoresValidos}/${containers.length} contenedores válidos. Faltan: ${contenedoresFaltantes.join(', ')}`,
            'warning'
        );
    } else {
        showNotification(
            `Todos los contenedores (${contenedoresValidos}) encontrados`,
            'success'
        );
    }
    
    // Filtrar datos
    const normalizedContainers = containers.map(c => c.toUpperCase());
    filteredData = csvData.filter(row => {
        const containerValue = (row.Contenedor || '').toUpperCase();
        return normalizedContainers.some(c => containerValue.includes(c));
    }).sort((a, b) => (a.Contenedor || '').localeCompare(b.Contenedor || ''));
    
    // Actualizar tabla
    currentPage = 1;
    renderTable();
    
    if (filteredData.length === 0) {
        showNotification('No se encontraron registros con los filtros aplicados', 'info');
    }
}

function clearFilters() {
    document.getElementById('container-list').value = '';
    document.getElementById('container-single').value = '';
    document.getElementById('container-suggestions').classList.add('hidden');
    
    filteredData = [...csvData];
    currentPage = 1;
    renderTable();
    
    showNotification('Filtros limpiados, mostrando todos los datos', 'info');
}

// ======== FUNCIONES DE TABLA Y EDICIÓN ========

function renderTable() {
    const tableBody = document.getElementById('table-body');
    const dataSection = document.getElementById('data-section');
    const noData = document.getElementById('no-data');
    
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        dataSection.classList.add('hidden');
        noData.classList.remove('hidden');
        return;
    }
    
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, filteredData.length);
    const pageData = filteredData.slice(start, end);
    
    document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages || 1}`;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
    
    pageData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.index = start + index;
        
        // Celda de checkbox
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'checkbox-wrapper';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.addEventListener('change', updateRemoveButtonState);
        checkboxCell.appendChild(checkbox);
        tr.appendChild(checkboxCell);
        
        // Celdas de datos
        Object.keys(row).forEach(key => {
            const td = document.createElement('td');
            
            if (editableColumns.includes(key)) {
                td.className = 'editable';
                const input = document.createElement(key === 'Observaciones' ? 'textarea' : 'input');
                input.className = 'cell-input';
                input.value = row[key] || '';
                input.dataset.field = key;
                input.dataset.index = start + index;
                
                if (key === 'Observaciones') {
                    input.rows = 1;
                    input.style.overflow = 'hidden';
                    input.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
                    });
                    setTimeout(() => {
                        input.style.height = 'auto';
                        input.style.height = (input.scrollHeight) + 'px';
                    }, 0);
                }
                
                input.addEventListener('blur', saveEditableCell);
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        this.blur();
                        e.preventDefault();
                    }
                });
                
                td.appendChild(input);
                
                if (key === 'Observaciones' && row[key]) {
                    td.classList.add('highlight');
                }
            } else {
                td.textContent = row[key] || '';
            }
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
    
    dataSection.classList.remove('hidden');
    noData.classList.add('hidden');
}

function saveEditableCell(event) {
    const input = event.target;
    const field = input.dataset.field;
    const index = parseInt(input.dataset.index);
    const value = input.value;
    
    filteredData[index][field] = value;
    
    const originalIndex = csvData.findIndex(row => 
        row.Contenedor === filteredData[index].Contenedor && 
        row.OC === filteredData[index].OC &&
        row.Id_art === filteredData[index].Id_art
    );
    
    if (originalIndex !== -1) {
        csvData[originalIndex][field] = value;
        localStorage.setItem('containerData', JSON.stringify(csvData));
    }
    
    if (field === 'Observaciones') {
        const td = input.parentElement;
        if (value && value.trim() !== '') {
            td.classList.add('highlight');
        } else {
            td.classList.remove('highlight');
        }
    }
}

// ======== FUNCIONES DE PAGINACIÓN ========

function changePage(delta) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage < 1 || newPage > totalPages) return;
    
    currentPage = newPage;
    renderTable();
}

// ======== FUNCIONES DE SELECCIÓN Y ELIMINACIÓN ========

function toggleSelectAll(event) {
    const selectAll = event.target.checked;
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.checked = selectAll;
    });
    updateRemoveButtonState();
}

function updateRemoveButtonState() {
    document.getElementById('remove-selected').disabled = 
        document.querySelectorAll('.row-checkbox:checked').length === 0;
}

function removeSelectedRows() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const indices = Array.from(checkboxes).map(checkbox => {
        return parseInt(checkbox.closest('tr').dataset.index);
    }).sort((a, b) => b - a);
    
    indices.forEach(index => {
        const removedItem = filteredData[index];
        filteredData.splice(index, 1);
        
        const originalIndex = csvData.findIndex(row => 
            row.Contenedor === removedItem.Contenedor && 
            row.OC === removedItem.OC &&
            row.Id_art === removedItem.Id_art
        );
        
        if (originalIndex !== -1) {
            csvData.splice(originalIndex, 1);
        }
    });
    
    localStorage.setItem('containerData', JSON.stringify(csvData));
    availableContainers = getUniqueContainers(csvData);
    currentPage = 1;
    renderTable();
    
    showNotification(`${indices.length} registros eliminados`, 'info');
}

// ======== FUNCIONES DE EXPORTACIÓN ========

function exportToExcel() {
    if (filteredData.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filteredData.map(row => ({
            'División': row.Division,
            'Contenedor': row.Contenedor,
            'OC': row.OC,
            'Proveedor': row.Proveedor,
            'Mercancía': row.Mercancia,
            'Id art': row.Id_art,
            'Piezas': row.Piezas,
            'Pre distribución': row.Pre_distribucion,
            'Cartones mix': row.Cartones_mix,
            'Cantidad por prepack': row.Cantidad_prepack,
            'Número de cajas': row.Numero_cajas,
            'Observaciones e incidencias': row.Observaciones
        })));
        
        const totalPiezas = filteredData.reduce((total, row) => total + (row.Piezas || 0), 0);
        XLSX.utils.sheet_add_aoa(ws, [['', '', '', '', '', 'TOTAL PIEZAS:', totalPiezas]], {origin: -1});
        
        ws['!cols'] = [
            { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, 
            { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 15 },
            { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 25 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Contenedores');
        XLSX.writeFile(wb, `contenedores_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification('Archivo Excel exportado correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showNotification('Error al exportar a Excel', 'error');
    }
}

function exportToPDF() {
    if (filteredData.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        doc.setFontSize(16);
        doc.text('Reporte de Contenedores', 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 22);
        
        const columns = [
            { header: 'División', dataKey: 'Division' },
            { header: 'Contenedor', dataKey: 'Contenedor' },
            { header: 'OC', dataKey: 'OC' },
            { header: 'Proveedor', dataKey: 'Proveedor' },
            { header: 'Mercancía', dataKey: 'Mercancia' },
            { header: 'Id art', dataKey: 'Id_art' },
            { header: 'Piezas', dataKey: 'Piezas' },
            { header: 'Pre distribución', dataKey: 'Pre_distribucion' },
            { header: 'Cartones mix', dataKey: 'Cartones_mix' },
            { header: 'Cantidad prepack', dataKey: 'Cantidad_prepack' },
            { header: 'Núm. cajas', dataKey: 'Numero_cajas' },
            { 
                header: 'Observaciones', 
                dataKey: 'Observaciones',
                cellWidth: 'auto',
                minCellHeight: 10,
                styles: { cellPadding: 1, fontSize: 11, valign: 'middle' }
            }
        ];
        
        const totalPiezas = filteredData.reduce((total, row) => total + (row.Piezas || 0), 0);
        
        doc.autoTable({
            columns: columns,
            body: filteredData.map(row => ({
                ...row,
                Observaciones: (row.Observaciones || '').substring(0, 500)
            })),
            startY: 25,
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: { Observaciones: { cellWidth: 35, minCellHeight: 8 } },
            didDrawCell: function(data) {
                if (data.column.dataKey === 'Observaciones' && data.cell.raw) {
                    doc.setFillColor(255, 255, 204);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(0, 0, 0);
                    doc.text(doc.splitTextToSize(data.cell.raw.toString(), data.cell.width - 2), 
                            data.cell.x + 1, data.cell.y + 5);
                }
            },
            didDrawPage: function(data) {
                doc.setFontSize(8);
                doc.text(`Página ${doc.internal.getNumberOfPages()}`, 
                        doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
            }
        });
        
        const finalY = doc.previousAutoTable.finalY || 200;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`TOTAL de PIEZAS: ${totalPiezas.toLocaleString()}`, 14, finalY + 10);
        
        doc.save(`Reporte_de_contenedores_${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('Archivo PDF exportado correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar a PDF:', error);
        showNotification('Error al exportar a PDF', 'error');
    }
}

// ======== FUNCIONES DE UTILIDAD ========

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notification.className = 'notification';
    switch (type) {
        case 'success': notification.style.backgroundColor = '#28a745'; break;
        case 'error': notification.style.backgroundColor = '#dc3545'; break;
        case 'warning': 
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#212529';
            break;
        default: notification.style.backgroundColor = '#17a2b8';
    }
    
    notificationMessage.textContent = message;
    notification.classList.add('show');
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.classList.add('hidden'), 400);
    }, 5000);
}