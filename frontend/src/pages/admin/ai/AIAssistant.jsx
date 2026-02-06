import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import {
    Brain, Send, History, Settings, Sparkles, Clock,
    Database, ChevronRight, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAssistant() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [history, setHistory] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [config, setConfig] = useState({});
    const [activeTab, setActiveTab] = useState('chat'); // chat, history, config
    const [showSQL, setShowSQL] = useState(false);

    useEffect(() => {
        fetchSuggestions();
        fetchHistory();
        fetchConfig();
    }, []);

    const fetchSuggestions = async () => {
        try {
            const res = await api.get('/aiAssistant/suggestions');
            setSuggestions(res.data.suggestions || []);
        } catch (error) {
            console.error('Error cargando sugerencias:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/aiAssistant/history');
            setHistory(res.data.history || []);
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await api.get('/aiAssistant/config');
            setConfig(res.data.config || {});
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!question.trim() || loading) return;

        setLoading(true);
        setResponse(null);

        try {
            const res = await api.post('/aiAssistant/query', { question });
            setResponse(res.data);
            if (res.data.success) {
                fetchHistory();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error procesando consulta');
            setResponse({
                success: false,
                answer: error.response?.data?.message || 'Error al procesar la consulta'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuestion(suggestion);
    };

    const handleHistoryClick = (item) => {
        setQuestion(item.pregunta);
        setResponse({
            success: true,
            answer: item.respuesta
        });
        setActiveTab('chat');
    };

    const handleSaveConfig = async () => {
        try {
            await api.put('/aiAssistant/config', { config });
            toast.success('Configuración guardada');
        } catch (error) {
            toast.error('Error guardando configuración');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        Asistente IA de Business Intelligence
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Pregunta lo que quieras sobre tu negocio en lenguaje natural
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {[
                        { id: 'chat', label: 'Chat', icon: Sparkles },
                        { id: 'history', label: 'Historial', icon: History },
                        { id: 'config', label: 'Configuración', icon: Settings }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* API Status */}
            <Card className={`border-l-4 ${config.ai_api_key_configured ? 'border-l-green-500 bg-green-50' : 'border-l-yellow-500 bg-yellow-50'}`}>
                <CardContent className="py-3 flex items-center gap-3">
                    {config.ai_api_key_configured ? (
                        <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-700">API de OpenAI configurada ({config.ai_api_key_preview})</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <span className="text-yellow-700">API de OpenAI no configurada. Agrega OPENAI_API_KEY en el archivo .env</span>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Tab: Chat */}
            {activeTab === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Chat Area */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Input */}
                        <Card className="shadow-xl border-0">
                            <CardContent className="p-4">
                                <form onSubmit={handleSubmit} className="flex gap-3">
                                    <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="Escribe tu pregunta aquí... Ej: ¿Cuánto vendí este mes?"
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !question.trim()}
                                        className="px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Response */}
                        {response && (
                            <Card className={`shadow-lg border-0 ${response.success ? 'bg-gradient-to-br from-purple-50 to-pink-50' : 'bg-red-50'}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${response.success ? 'bg-purple-100' : 'bg-red-100'}`}>
                                            <Brain className={`w-6 h-6 ${response.success ? 'text-purple-600' : 'text-red-600'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800 mb-2">Respuesta</h3>
                                            <p className="text-gray-700 whitespace-pre-wrap">{response.answer}</p>

                                            {response.success && response.sql && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => setShowSQL(!showSQL)}
                                                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                                    >
                                                        <Database className="w-4 h-4" />
                                                        {showSQL ? 'Ocultar SQL' : 'Ver SQL generado'}
                                                    </button>
                                                    {showSQL && (
                                                        <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded-lg text-sm overflow-x-auto">
                                                            {response.sql}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}

                                            {response.duration && (
                                                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Procesado en {response.duration}ms
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Data Table if available */}
                        {response?.success && response?.data?.length > 0 && (
                            <Card className="shadow-lg border-0 overflow-hidden">
                                <CardHeader className="bg-gray-50">
                                    <CardTitle className="text-sm font-medium text-gray-600">
                                        Datos ({response.rowCount} registros)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-600">
                                                <tr>
                                                    {Object.keys(response.data[0]).map(key => (
                                                        <th key={key} className="px-4 py-2 text-left font-medium">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {response.data.slice(0, 10).map((row, i) => (
                                                    <tr key={i} className="border-t hover:bg-gray-50">
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="px-4 py-2">
                                                                {val !== null ? String(val) : '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - Suggestions */}
                    <div>
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    Sugerencias
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {suggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-700 text-sm transition-all flex items-center gap-2 group"
                                    >
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                        {suggestion}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Tab: History */}
            {activeTab === 'history' && (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-500" />
                            Historial de Consultas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No hay consultas en el historial</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleHistoryClick(item)}
                                        className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-purple-50 transition-all"
                                    >
                                        <p className="font-medium text-gray-800">{item.pregunta}</p>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.respuesta}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(item.created_at).toLocaleString()}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab: Config */}
            {activeTab === 'config' && (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-500" />
                            Configuración de IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-yellow-700">
                                ⚠️ La API Key de OpenAI debe configurarse en el archivo <code className="bg-yellow-100 px-1 rounded">.env</code> del servidor por seguridad.
                            </p>
                        </div>

                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de IA</label>
                                <select
                                    value={config.ai_model || 'gpt-3.5-turbo'}
                                    onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 p-2.5 border"
                                >
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Rápido, económico)</option>
                                    <option value="gpt-4">GPT-4 (Más preciso, más costoso)</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo (Balance)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Tokens</label>
                                <input
                                    type="number"
                                    value={config.ai_max_tokens || 500}
                                    onChange={(e) => setConfig({ ...config, ai_max_tokens: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 p-2.5 border"
                                />
                                <p className="text-xs text-gray-500 mt-1">Mayor cantidad = respuestas más largas pero más costosas</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="ai_enabled"
                                    checked={config.ai_enabled !== 'false'}
                                    onChange={(e) => setConfig({ ...config, ai_enabled: e.target.checked ? 'true' : 'false' })}
                                    className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                                />
                                <label htmlFor="ai_enabled" className="text-sm text-gray-700">
                                    Habilitar Asistente IA
                                </label>
                            </div>
                        </div>

                        <Button onClick={handleSaveConfig} className="bg-purple-500 hover:bg-purple-600 text-white">
                            Guardar Configuración
                        </Button>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
