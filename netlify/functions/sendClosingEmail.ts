export default async (event: any) => {
  // Solo permitir POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { email, username, closingData, employeeMetrics, notes, date } =
      JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email no proporcionado" }),
      };
    }

    // Generar tabla de empleados
    const employeeTableHTML =
      employeeMetrics && employeeMetrics.length > 0
        ? `
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f0f0f0; border-bottom: 2px solid #333;">
              <th style="padding: 10px; text-align: left; font-weight: bold;">Empleado</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Ventas</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Propinas</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${employeeMetrics
              .map(
                (emp: any) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">${emp.userName}</td>
                <td style="padding: 10px; text-align: right;">$${emp.totalSales.toFixed(
                  2
                )}</td>
                <td style="padding: 10px; text-align: right;">$${emp.totalTips.toFixed(
                  2
                )}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">$${(
                  emp.totalSales + emp.totalTips
                ).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
        : "";

    const total = closingData?.totalSales || 0;
    const discounts = closingData?.totalDiscounts || 0;
    const tips = closingData?.totalTips || 0;
    const toDeposit = total - discounts + tips;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; font-size: 14px; }
          .section { margin: 20px 0; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .metric-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-card h3 { margin: 0; font-size: 12px; opacity: 0.9; }
          .metric-card .value { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .section-title { font-size: 16px; font-weight: bold; color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 10px; }
          .info-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
          .info-line strong { color: #333; }
          .info-line span { text-align: right; }
          .notes { background: #f9f9f9; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏪 TPV SOLUTIONS</h1>
            <p>Reporte de Cierre de Caja</p>
            <p>${date}</p>
            <p>Cajero: ${username}</p>
          </div>

          <div class="section">
            <div class="section-title">📊 Métricas Principales</div>
            <div class="metrics">
              <div class="metric-card">
                <h3>Total Ventas</h3>
                <div class="value">$${total.toFixed(2)}</div>
              </div>
              <div class="metric-card">
                <h3>Transacciones</h3>
                <div class="value">${closingData?.transactionCount || 0}</div>
              </div>
              <div class="metric-card">
                <h3>Ticket Promedio</h3>
                <div class="value">$${(closingData?.averageTicket || 0).toFixed(2)}</div>
              </div>
              <div class="metric-card">
                <h3>Propinas</h3>
                <div class="value">$${tips.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">💰 Resumen Financiero</div>
            <div class="info-line">
              <strong>Subtotal:</strong>
              <span>$${total.toFixed(2)}</span>
            </div>
            <div class="info-line">
              <strong>Descuentos:</strong>
              <span style="color: red;">-$${discounts.toFixed(2)}</span>
            </div>
            <div class="info-line">
              <strong>Propinas:</strong>
              <span style="color: green;">+$${tips.toFixed(2)}</span>
            </div>
            <div class="info-line" style="border-bottom: 2px solid #333; border-top: 2px solid #333; padding: 15px 0; font-size: 18px;">
              <strong>A DEPOSITAR:</strong>
              <span style="font-weight: bold; color: #f59e0b;">$${toDeposit.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">💳 Desglose de Pagos</div>
            <div class="info-line">
              <strong>Efectivo:</strong>
              <span>$${(closingData?.totalCash || 0).toFixed(2)}</span>
            </div>
            <div class="info-line">
              <strong>Digital:</strong>
              <span>$${(closingData?.totalDigital || 0).toFixed(2)}</span>
            </div>
            <div class="info-line">
              <strong>CLIP:</strong>
              <span>$${(closingData?.totalClip || 0).toFixed(2)}</span>
            </div>
          </div>

          ${employeeTableHTML ? `
          <div class="section">
            <div class="section-title">👥 Desempeño de Empleados</div>
            ${employeeTableHTML}
          </div>
          ` : ""}

          ${notes ? `
          <div class="notes">
            <strong>📝 Notas:</strong>
            <p>${notes}</p>
          </div>
          ` : ""}

          <div class="footer">
            <p>Este es un correo automático generado por Reisbloc POS</p>
            <p>Por favor, guarda este correo como comprobante de tu cierre de caja</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // En desarrollo, guardar en console
    console.log("📧 EMAIL CONTENT:");
    console.log("To:", email);
    console.log("Subject: 📊 Reporte de Cierre de Caja -", date);
    console.log("HTML Content generated");

    // TODO: Integrar con servicio de correo real (SendGrid, Mailgun, etc.)
    // Por ahora, retornar éxito simulado

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Correo procesado (en desarrollo, revisar console)",
        email,
      }),
    };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error al procesar el correo",
        details: error.message,
      }),
    };
  }
};
