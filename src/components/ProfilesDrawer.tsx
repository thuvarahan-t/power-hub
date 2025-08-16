import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Save, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  name: string;
  voltage: number;
  current: number;
  outputEnabled: boolean;
  createdAt: number;
}

interface ProfilesDrawerProps {
  currentVoltage: number;
  currentCurrent: number;
  currentOutputEnabled: boolean;
  onApplyProfile: (profile: Profile) => void;
  onSend?: (command: string) => void;
}

export const ProfilesDrawer: React.FC<ProfilesDrawerProps> = ({
  currentVoltage,
  currentCurrent,
  currentOutputEnabled,
  onApplyProfile,
  onSend
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load profiles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('power-hub-profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfiles(parsed);
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    } else {
      // Set default profiles
      const defaultProfiles: Profile[] = [
        {
          id: 'default-1',
          name: '5V / 1A',
          voltage: 5.0,
          current: 1.0,
          outputEnabled: false,
          createdAt: Date.now() - 86400000
        },
        {
          id: 'default-2', 
          name: '9V / 1.5A',
          voltage: 9.0,
          current: 1.5,
          outputEnabled: false,
          createdAt: Date.now() - 43200000
        },
        {
          id: 'default-3',
          name: '12V / 1A',
          voltage: 12.0,
          current: 1.0,
          outputEnabled: false,
          createdAt: Date.now() - 21600000
        }
      ];
      setProfiles(defaultProfiles);
      localStorage.setItem('power-hub-profiles', JSON.stringify(defaultProfiles));
    }
  }, []);

  const saveProfiles = (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('power-hub-profiles', JSON.stringify(newProfiles));
  };

  const saveNewProfile = () => {
    if (!newProfileName.trim()) {
      toast({
        title: "Profile Name Required",
        description: "Please enter a name for the profile",
        variant: "destructive"
      });
      return;
    }

    const newProfile: Profile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      voltage: currentVoltage,
      current: currentCurrent,
      outputEnabled: currentOutputEnabled,
      createdAt: Date.now()
    };

    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    setNewProfileName('');
    
    toast({
      title: "Profile Saved",
      description: `"${newProfile.name}" saved successfully`
    });
  };

  const applyProfile = (profile: Profile) => {
    onApplyProfile(profile);
    
    // Send combined command if connected
    if (onSend) {
      const command = `SET V=${profile.voltage.toFixed(2)} I=${Math.round(profile.current * 1000)} O=${profile.outputEnabled ? 1 : 0}`;
      onSend(command);
    }
    
    toast({
      title: "Profile Applied",
      description: `Applied "${profile.name}": ${profile.voltage}V / ${profile.current}A`
    });
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    
    const updated = profiles.map(p => 
      p.id === editingId ? { ...p, name: editName.trim() } : p
    );
    saveProfiles(updated);
    setEditingId(null);
    setEditName('');
    
    toast({
      title: "Profile Renamed",
      description: "Profile name updated successfully"
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const deleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    saveProfiles(updated);
    setDeleteId(null);
    
    toast({
      title: "Profile Deleted",
      description: "Profile removed successfully"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Save className="h-5 w-5" />
          Voltage/Current Profiles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save Current Settings */}
        <div className="flex gap-2">
          <Input
            placeholder="Profile name..."
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && saveNewProfile()}
            className="flex-1"
          />
          <Button onClick={saveNewProfile} disabled={!newProfileName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>

        {/* Current Settings Preview */}
        <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded border border-dashed">
          Current: {currentVoltage.toFixed(2)}V / {currentCurrent.toFixed(2)}A 
          {currentOutputEnabled && <Badge variant="outline" className="ml-2">ON</Badge>}
        </div>

        {/* Profiles List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No profiles saved yet
            </div>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingId === profile.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          className="h-7 text-sm"
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-sm">{profile.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {profile.voltage.toFixed(2)}V / {profile.current.toFixed(2)}A
                          {profile.outputEnabled && (
                            <Badge variant="outline" className="ml-2 text-xs">ON</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {editingId !== profile.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => applyProfile(profile)}
                        className="h-7 px-2"
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(profile)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(profile.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this profile? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteProfile(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};