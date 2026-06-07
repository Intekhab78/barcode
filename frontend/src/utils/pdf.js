import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (items) => {
    // Each label is 30mm width x 25mm height
    // We set the PDF format to exactly the label size for label printers
    const doc = new jsPDF({
        orientation: 'landscape', // Width is larger than height
        unit: 'mm',
        format: [30, 25]
    });

    const labelWidth = 30;
    const labelHeight = 25;

    let totalIndex = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const labelElement = document.getElementById(`label-${item._id}`);
        const stock = parseInt(item.stock || 1);

        if (labelElement) {
            const canvas = await html2canvas(labelElement, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');

            for (let s = 0; s < stock; s++) {
                // If it's not the first overall label, add a new page
                if (totalIndex > 0) {
                    doc.addPage([30, 25], 'landscape');
                }

                // Add image covering the entire small page
                doc.addImage(imgData, 'PNG', 0, 0, labelWidth, labelHeight);
                totalIndex++;
            }
        }
    }

    doc.save('labels.pdf');
};
