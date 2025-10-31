import jobCard from "./JobCard.jsx";

export default function ResultsSection({ loading, err, items }) {
    if (err) {
        return <div className="error">{err}</div>;
    }

    if (loading) {
        return <div className="loadign">Carregando...</div>;
    }

    if (items || items.length === 0) {
        return (
            <div className="empty">
                Nenhum resultado nessa combinação de filtros.
            </div>
        );
    }

    return (
        <>
            {items.map(job =>(
                <jobCard key={job.id} job={job} />
            ))}
        </>
    );
}