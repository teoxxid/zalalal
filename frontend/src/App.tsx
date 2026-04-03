import { useEffect, useState } from 'react';
import axios from 'axios';

interface Service {
    id: number;
    name: string;
    price: string;
    image_url: string;
    category: string;
    brand: string;
    rating: string;
}

function App() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios.get('http://localhost:8000/api/services/')
            .then(response => {
                setServices(response.data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Ошибка загрузки:', err);
                setError('Не удалось загрузить товары');
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Загрузка...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>VoltMarket</h1>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px'
            }}>
                {services.map(service => (
                    <div key={service.id} style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '15px',
                        textAlign: 'center',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <img
                            src={service.image_url}
                            alt={service.name}
                            style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'contain',
                                marginBottom: '10px'
                            }}
                        />
                        <h3 style={{ fontSize: '16px', margin: '10px 0' }}>{service.name}</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#005bff' }}>{service.price} ₽</p>
                        <p style={{ color: '#666', fontSize: '14px' }}>{service.category}</p>
                        <p style={{ color: '#ffa500' }}>★ {service.rating}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;