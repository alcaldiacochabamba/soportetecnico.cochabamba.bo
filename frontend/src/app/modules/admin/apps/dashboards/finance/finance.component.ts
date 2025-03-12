// Método privado para formatear fechas de manera consistente
private formatDate(dateString: string | null | undefined): string {
    if (!dateString || dateString.trim() === '' || dateString.trim() === ' ') {
        return '';
    }

    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString();
    } catch {
        return '';
    }
}

// Método para formatear fechas en los reportes
private formatDisplayDate(dateString: string | null | undefined): string {
    const formattedDate = this.formatDate(dateString);
    if (!formattedDate) return 'N/A';

    try {
        return new Date(formattedDate).toLocaleDateString();
    } catch {
        return 'N/A';
    }
}

private async generarPDFCompleto(): Promise<jsPDFWithPlugin> {
    // ... código anterior ...

    const tableData = response.data.data.map((row, index) => [
        index + 1,
        row.numero,
        row.tipo,
        this.getTecnicoNombre(row.tecnicoAsignado),
        this.formatDisplayDate(row.fechaInicio),
        this.formatDisplayDate(row.fechaTerminado),
        row.nombreSolicitante
    ]);

    // ... resto del código
}

// Modificar otros métodos que usen fechas
formatDateForApi(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

private adjustEndDate(endDate: Date): Date {
    if (!endDate) return new Date();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(endDate);
    compareDate.setHours(0, 0, 0, 0);
    
    // Si la fecha fin es el día actual, agregar un día más
    if (compareDate.getTime() === today.getTime()) {
        const adjustedDate = new Date(endDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        return adjustedDate;
    }
    
    return endDate;
} 