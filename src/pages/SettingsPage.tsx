import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TeachersSection from './settingsSections/TeachersSection'
import EnumsSection from './settingsSections/EnumsSection'
import WeightCategoriesSection from './settingsSections/WeightCategoriesSection'

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="heading-display text-3xl md:text-4xl">Configuración</h1>
      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Profesores</TabsTrigger>
          <TabsTrigger value="modalities">Modalidades</TabsTrigger>
          <TabsTrigger value="belts">Cinturones</TabsTrigger>
          <TabsTrigger value="payments">Estados de pago</TabsTrigger>
          <TabsTrigger value="weights">Categorías de peso</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers"><TeachersSection /></TabsContent>
        <TabsContent value="modalities"><EnumsSection table="modalities" title="Modalidades" /></TabsContent>
        <TabsContent value="belts"><EnumsSection table="belts" title="Cinturones" hasColor hasOrder /></TabsContent>
        <TabsContent value="payments"><EnumsSection table="payment_statuses" title="Estados de pago" hasIsPaid hasOrder /></TabsContent>
        <TabsContent value="weights"><WeightCategoriesSection /></TabsContent>
      </Tabs>
    </div>
  )
}
