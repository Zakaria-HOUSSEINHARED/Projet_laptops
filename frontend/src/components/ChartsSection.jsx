import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

// 📊 Enregistrer Chart.js seulement quand ce composant est chargé
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

export default function ChartsSection({ stats }) {
  const doughnutData = {
    labels: ["Disponibles", "Attribués", "En maintenance"],
    datasets: [
      {
        data: [stats.disponibles, stats.attribues, stats.maintenance],
        backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b"],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: (stats.parMarque || []).map((m) => m.marque),
    datasets: [
      {
        label: "Laptops par marque",
        data: (stats.parMarque || []).map((m) => m.nb),
        backgroundColor: "#3b82f6",
        borderRadius: 6,
      },
    ],
  };

  return (
    <section>
      <h2
        style={{
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: "1rem",
        }}
      >
        📊 Graphiques du parc
      </h2>
      {/* 📱 Responsive: 1 colonne mobile, 2 colonnes desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          }}
        >
          <h3
            style={{ margin: "0 0 1rem", color: "#1e293b", fontSize: "1rem" }}
          >
            Répartition par statut
          </h3>
          <Doughnut
            data={doughnutData}
            options={{ plugins: { legend: { position: "bottom" } } }}
          />
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          }}
        >
          <h3
            style={{ margin: "0 0 1rem", color: "#1e293b", fontSize: "1rem" }}
          >
            Laptops par marque
          </h3>
          <Bar
            data={barData}
            options={{
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>
      </div>
    </section>
  );
}
