import { useState } from 'react'
import { Tabs, Input, Label } from '@medusajs/ui'

interface ArticleTranslationTabsProps {
  titleEn: string
  titleIr: string
  contentEn: string
  contentIr: string
  excerptEn: string
  excerptIr: string
  metaTitleEn: string
  metaTitleIr: string
  metaDescEn: string
  metaDescIr: string
  onTitleEnChange: (value: string) => void
  onTitleIrChange: (value: string) => void
  onContentEnChange: (value: string) => void
  onContentIrChange: (value: string) => void
  onExcerptEnChange: (value: string) => void
  onExcerptIrChange: (value: string) => void
  onMetaTitleEnChange: (value: string) => void
  onMetaTitleIrChange: (value: string) => void
  onMetaDescEnChange: (value: string) => void
  onMetaDescIrChange: (value: string) => void
  editorEn: React.ReactNode
  editorIr: React.ReactNode
}

export const ArticleTranslationTabs = ({
  titleEn,
  titleIr,
  excerptEn,
  excerptIr,
  metaTitleEn,
  metaTitleIr,
  metaDescEn,
  metaDescIr,
  onTitleEnChange,
  onTitleIrChange,
  onExcerptEnChange,
  onExcerptIrChange,
  onMetaTitleEnChange,
  onMetaTitleIrChange,
  onMetaDescEnChange,
  onMetaDescIrChange,
  editorEn,
  editorIr,
}: ArticleTranslationTabsProps) => {
  const [activeTab, setActiveTab] = useState('en')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List>
        <Tabs.Trigger value="en">English</Tabs.Trigger>
        <Tabs.Trigger value="ir">Persian (Farsi)</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="en" className="mt-4 space-y-4">
        <div>
          <Label size="small">Title (EN)</Label>
          <Input
            size="small"
            value={titleEn}
            onChange={(e) => onTitleEnChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label size="small">Excerpt (EN)</Label>
          <Input
            size="small"
            value={excerptEn}
            onChange={(e) => onExcerptEnChange(e.target.value)}
            className="mt-1"
          />
        </div>
        {editorEn}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label size="small">Meta Title (EN)</Label>
            <Input
              size="small"
              value={metaTitleEn}
              onChange={(e) => onMetaTitleEnChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label size="small">Meta Description (EN)</Label>
            <Input
              size="small"
              value={metaDescEn}
              onChange={(e) => onMetaDescEnChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Tabs.Content>
      <Tabs.Content value="ir" className="mt-4 space-y-4">
        <div>
          <Label size="small">Title (IR)</Label>
          <Input
            size="small"
            value={titleIr}
            onChange={(e) => onTitleIrChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label size="small">Excerpt (IR)</Label>
          <Input
            size="small"
            value={excerptIr}
            onChange={(e) => onExcerptIrChange(e.target.value)}
            className="mt-1"
          />
        </div>
        {editorIr}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label size="small">Meta Title (IR)</Label>
            <Input
              size="small"
              value={metaTitleIr}
              onChange={(e) => onMetaTitleIrChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label size="small">Meta Description (IR)</Label>
            <Input
              size="small"
              value={metaDescIr}
              onChange={(e) => onMetaDescIrChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Tabs.Content>
    </Tabs>
  )
}
