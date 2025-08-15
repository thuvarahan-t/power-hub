import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Battery, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="sticky top-[180px] z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-card/50 border border-primary/20">
            <TabsTrigger 
              value="load" 
              className={cn(
                "flex items-center gap-2 transition-all",
                "data-[state=active]:bg-gradient-electric data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-electric/30"
              )}
            >
              <Zap className="h-4 w-4" />
              Load Output
            </TabsTrigger>
            <TabsTrigger 
              value="battery"
              className={cn(
                "flex items-center gap-2 transition-all",
                "data-[state=active]:bg-gradient-warning data-[state=active]:text-warning-foreground",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-warning/30"
              )}
            >
              <Battery className="h-4 w-4" />
              Charge Battery
            </TabsTrigger>
            <TabsTrigger 
              value="mobile"
              className={cn(
                "flex items-center gap-2 transition-all",
                "data-[state=active]:bg-gradient-success data-[state=active]:text-success-foreground",
                "data-[state=active]:shadow-lg data-[state=active]:shadow-success/30"
              )}
            >
              <Smartphone className="h-4 w-4" />
              Charge Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};